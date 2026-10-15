import crypto from 'crypto';
import {
  AuditAction,
  FeeCycle,
  FeeStructureStatus,
  InvoiceStatus,
  OfflinePaymentStatus,
  Prisma,
} from '@prisma/client';
import prisma from '../../config/database';
import config from '../../config/env';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { auditLog } from '../auditLog/service';
import { assertInvoiceAccess, getInvoiceScope } from '../payment/access';
import { assertParentStudentAccess } from '../parent/access';
import { cacheDelPattern } from '../../config/redis';

interface FeeItem {
  name: string;
  amount: number;
  description?: string;
}

function sumItems(items: FeeItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

function invoiceNumber(): string {
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function calculateLateFee(subtotal: number, dueDate: Date, rule: unknown): number {
  if (!rule || new Date() <= dueDate) return 0;
  const parsed = rule as { type?: string; value?: number; graceDays?: number };
  const graceUntil = new Date(dueDate);
  graceUntil.setDate(graceUntil.getDate() + Number(parsed.graceDays || 0));
  if (new Date() <= graceUntil) return 0;
  const value = Math.max(0, Number(parsed.value || 0));
  return parsed.type === 'PERCENTAGE'
    ? Math.round(subtotal * (value / 100) * 100) / 100
    : value;
}

export class FinanceService {
  async createStructure(data: {
    academicYear: string;
    classId: string;
    section?: string;
    feeType: string;
    feeItems: FeeItem[];
    cycle: FeeCycle;
    dueDate: string;
    lateFeeRule?: unknown;
    discountRules?: unknown;
  }, actorId: string, req: AuthenticatedRequest) {
    const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Class not found');

    const activeKey = [data.classId, data.section || '*', data.feeType.toLowerCase(), data.academicYear].join(':');
    const structure = await prisma.feeStructure.create({
      data: {
        ...data,
        section: data.section || null,
        dueDate: new Date(data.dueDate),
        feeItems: data.feeItems as unknown as Prisma.InputJsonValue,
        lateFeeRule: data.lateFeeRule as Prisma.InputJsonValue | undefined,
        discountRules: data.discountRules as Prisma.InputJsonValue | undefined,
        activeKey,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await this.audit(actorId, AuditAction.FEE_STRUCTURE_CREATED, 'FeeStructure', structure.id, req);
    return structure;
  }

  async listStructures(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { classId, academicYear, status } = req.query;
    const where: Prisma.FeeStructureWhereInput = {
      ...(classId ? { classId: String(classId) } : {}),
      ...(academicYear ? { academicYear: String(academicYear) } : {}),
      ...(status ? { status: status as FeeStructureStatus } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.feeStructure.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.feeStructure.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getStructure(id: string) {
    const structure = await prisma.feeStructure.findUnique({ where: { id } });
    if (!structure) throw AppError.notFound('Fee structure not found');
    return structure;
  }

  async updateStructure(id: string, data: Record<string, unknown>, actorId: string, req: AuthenticatedRequest) {
    const current = await this.getStructure(id);
    const section = data.section === undefined ? current.section : String(data.section || '') || null;
    const feeType = data.feeType === undefined ? current.feeType : String(data.feeType);
    const academicYear = data.academicYear === undefined ? current.academicYear : String(data.academicYear);
    const classId = data.classId === undefined ? current.classId : String(data.classId);
    const activeKey = [classId, section || '*', feeType.toLowerCase(), academicYear].join(':');
    const update: Prisma.FeeStructureUpdateInput = {
      ...data,
      ...(data.dueDate ? { dueDate: new Date(String(data.dueDate)) } : {}),
      activeKey,
      updatedBy: actorId,
    } as Prisma.FeeStructureUpdateInput;
    const structure = await prisma.feeStructure.update({ where: { id }, data: update });
    await this.audit(actorId, AuditAction.FEE_STRUCTURE_UPDATED, 'FeeStructure', id, req);
    return structure;
  }

  async deactivateStructure(id: string, actorId: string, req: AuthenticatedRequest) {
    const current = await this.getStructure(id);
    const structure = await prisma.feeStructure.update({
      where: { id },
      data: {
        status: FeeStructureStatus.INACTIVE,
        activeKey: `${current.activeKey}:inactive:${id}`,
        updatedBy: actorId,
      },
    });
    await this.audit(actorId, AuditAction.FEE_STRUCTURE_UPDATED, 'FeeStructure', id, req);
    return structure;
  }

  async generateInvoices(data: { structureId: string; studentId?: string; classId?: string; discountAmount: number }, actorId: string, req: AuthenticatedRequest) {
    const structure = await this.getStructure(data.structureId);
    if (structure.status !== FeeStructureStatus.ACTIVE) throw AppError.unprocessable('Fee structure is inactive');
    const classId = data.classId || structure.classId;
    if (classId !== structure.classId) throw AppError.unprocessable('Class does not match the fee structure');

    const students = await prisma.studentProfile.findMany({
      where: {
        classId,
        deletedAt: null,
        ...(data.studentId ? { id: data.studentId } : {}),
      },
      select: { id: true, classId: true },
    });
    if (!students.length) throw AppError.notFound('No eligible students found');

    const items = structure.feeItems as unknown as FeeItem[];
    const subtotal = sumItems(items);
    if (data.discountAmount > subtotal) throw AppError.unprocessable('Discount cannot exceed invoice subtotal');
    const lateFee = calculateLateFee(subtotal, structure.dueDate, structure.lateFeeRule);
    const payable = Math.round((subtotal - data.discountAmount + lateFee) * 100) / 100;

    const invoices = await prisma.$transaction(
      students.map((student) => prisma.feeInvoice.create({
        data: {
          invoiceNumber: invoiceNumber(),
          sourceKey: `${student.id}:${structure.id}:${structure.academicYear}`,
          structureId: structure.id,
          studentId: student.id,
          classId: student.classId!,
          section: structure.section,
          academicYear: structure.academicYear,
          feeItems: items as unknown as Prisma.InputJsonValue,
          subtotalAmount: subtotal,
          discountAmount: data.discountAmount,
          lateFeeAmount: lateFee,
          payableAmount: payable,
          dueAmount: payable,
          dueDate: structure.dueDate,
          generatedBy: actorId,
        },
      }))
    );
    await Promise.all(invoices.map((invoice) => this.audit(actorId, AuditAction.FEE_INVOICE_CREATED, 'FeeInvoice', invoice.id, req)));
    return invoices;
  }

  async listInvoices(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const scope = await getInvoiceScope(req.user!);
    const { status, classId, studentId, academicYear } = req.query;
    if (studentId && req.user?.role === 'PARENT') {
      await assertParentStudentAccess(req.user, String(studentId));
    }
    if (studentId && req.user?.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!student || student.id !== String(studentId)) throw AppError.forbidden('You can only access your own fee invoices');
    }
    const where: Prisma.FeeInvoiceWhereInput = {
      AND: [scope as Prisma.FeeInvoiceWhereInput],
      ...(status ? { status: status as InvoiceStatus } : {}),
      ...(classId ? { classId: String(classId) } : {}),
      ...(studentId ? { studentId: String(studentId) } : {}),
      ...(academicYear ? { academicYear: String(academicYear) } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.feeInvoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.feeInvoice.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getInvoice(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const invoice = await prisma.feeInvoice.findUnique({ where: { id } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    await assertInvoiceAccess(invoice, user);
    return invoice;
  }

  async updateInvoice(id: string, data: { dueDate?: string; status?: InvoiceStatus }, actorId: string, req: AuthenticatedRequest) {
    const invoice = await prisma.feeInvoice.findUnique({ where: { id } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    const immutableStatuses: InvoiceStatus[] = [InvoiceStatus.PAID, InvoiceStatus.REFUNDED];
    if (immutableStatuses.includes(invoice.status)) {
      throw AppError.unprocessable('Paid or refunded invoices cannot be changed');
    }
    const updated = await prisma.feeInvoice.update({
      where: { id },
      data: {
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.status ? { status: data.status, ...(data.status === InvoiceStatus.CANCELLED ? { cancelledAt: new Date() } : {}) } : {}),
      },
    });
    await this.audit(actorId, AuditAction.FEE_INVOICE_UPDATED, 'FeeInvoice', id, req);
    return updated;
  }

  async createOfflinePayment(data: { invoiceId: string; amount: number; mode: string; referenceNumber?: string; proofFile?: string }, actorId: string, req: AuthenticatedRequest) {
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    const terminalStatuses: InvoiceStatus[] = [
      InvoiceStatus.PAID,
      InvoiceStatus.REFUNDED,
      InvoiceStatus.CANCELLED,
      InvoiceStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(invoice.status)) {
      throw AppError.unprocessable(`Invoice is ${invoice.status.toLowerCase()} and cannot accept offline payments`);
    }
    if (data.amount > invoice.dueAmount) throw AppError.unprocessable('Payment exceeds invoice due amount');
    const payment = await prisma.offlinePayment.create({
      data: { ...data, studentId: invoice.studentId, addedBy: actorId },
    });
    await this.audit(actorId, AuditAction.OFFLINE_PAYMENT_CREATED, 'OfflinePayment', payment.id, req);
    return payment;
  }

  async listOfflinePayments(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const status = req.query.status ? String(req.query.status) as OfflinePaymentStatus : undefined;
    const where: Prisma.OfflinePaymentWhereInput = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.offlinePayment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.offlinePayment.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async approveOfflinePayment(id: string, actorId: string, req: AuthenticatedRequest) {
    const payment = await prisma.offlinePayment.findUnique({ where: { id } });
    if (!payment) throw AppError.notFound('Offline payment not found');
    if (payment.status !== OfflinePaymentStatus.PENDING_VERIFICATION) throw AppError.conflict('Offline payment is already reviewed');
    if (config.OFFLINE_PAYMENT_APPROVAL_REQUIRED && payment.addedBy === actorId) {
      throw AppError.forbidden('A different admin must verify this offline payment');
    }
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findUnique({ where: { id: payment.invoiceId } });
      if (!invoice) throw AppError.notFound('Fee invoice not found');
      if (payment.amount > invoice.dueAmount) throw AppError.conflict('Invoice balance changed; payment exceeds current due amount');
      const paidAmount = invoice.paidAmount + payment.amount;
      const dueAmount = Math.max(0, invoice.payableAmount - paidAmount);
      const updatedPayment = await tx.offlinePayment.update({
        where: { id },
        data: { status: OfflinePaymentStatus.VERIFIED, verifiedBy: actorId, verifiedAt: new Date() },
      });
      const updatedInvoice = await tx.feeInvoice.updateMany({
        where: { id: invoice.id, paidAmount: invoice.paidAmount, dueAmount: invoice.dueAmount },
        data: { paidAmount, dueAmount, status: dueAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL },
      });
      if (updatedInvoice.count !== 1) {
        throw AppError.conflict('Invoice balance changed while verifying the offline payment');
      }
      await tx.receipt.create({
        data: {
          receiptNumber: `RCT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          sourceKey: `offline:${payment.id}`,
          invoiceId: invoice.id,
          offlinePaymentId: payment.id,
          studentId: invoice.studentId,
          amount: payment.amount,
          paymentMode: payment.mode,
          transactionReference: payment.referenceNumber,
          issuedBy: actorId,
        },
      });
      return updatedPayment;
    }).then(async (payment) => {
      await this.audit(actorId, AuditAction.OFFLINE_PAYMENT_APPROVED, 'OfflinePayment', id, req);
      await cacheDelPattern('analytics:*').catch(() => undefined);
      return payment;
    });
  }

  async rejectOfflinePayment(id: string, reason: string, actorId: string, req: AuthenticatedRequest) {
    const payment = await prisma.offlinePayment.findUnique({ where: { id } });
    if (!payment) throw AppError.notFound('Offline payment not found');
    if (payment.status !== OfflinePaymentStatus.PENDING_VERIFICATION) throw AppError.conflict('Offline payment is already reviewed');
    const updated = await prisma.offlinePayment.update({
      where: { id },
      data: { status: OfflinePaymentStatus.REJECTED, verifiedBy: actorId, rejectionReason: reason, verifiedAt: new Date() },
    });
    await this.audit(actorId, AuditAction.OFFLINE_PAYMENT_REJECTED, 'OfflinePayment', id, req);
    return updated;
  }

  async reportSummary() {
    const [invoiceTotals, payments, statusCounts] = await Promise.all([
      prisma.feeInvoice.aggregate({ _sum: { payableAmount: true, paidAmount: true, dueAmount: true, refundedAmount: true } }),
      prisma.paymentAttempt.count({ where: { status: 'CAPTURED' } }),
      prisma.feeInvoice.groupBy({ by: ['status'], _count: { _all: true }, _sum: { dueAmount: true } }),
    ]);
    return { totals: invoiceTotals._sum, verifiedOnlinePayments: payments, statusCounts };
  }

  async reportDues(req: AuthenticatedRequest) {
    const scope = await getInvoiceScope(req.user!);
    return prisma.feeInvoice.findMany({
      where: { ...scope, dueAmount: { gt: 0 }, status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async reportClassWise() {
    return prisma.feeInvoice.groupBy({
      by: ['classId'],
      _count: { _all: true },
      _sum: { payableAmount: true, paidAmount: true, dueAmount: true, refundedAmount: true },
    });
  }

  async reportStudentWise(req: AuthenticatedRequest) {
    const scope = await getInvoiceScope(req.user!);
    return prisma.feeInvoice.groupBy({
      by: ['studentId'],
      where: scope as Prisma.FeeInvoiceWhereInput,
      _count: { _all: true },
      _sum: { payableAmount: true, paidAmount: true, dueAmount: true, refundedAmount: true },
    });
  }

  async reportSettlements() {
    return prisma.paymentAttempt.groupBy({
      by: ['status', 'currency'],
      _count: { _all: true },
      _sum: { amount: true },
    });
  }

  private audit(actorId: string, action: AuditAction, entity: string, entityId: string, req: AuthenticatedRequest) {
    return auditLog({ actorId, action, entity, entityId, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }
}
