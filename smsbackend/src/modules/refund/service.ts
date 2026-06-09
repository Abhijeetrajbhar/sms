import {
  AuditAction,
  InvoiceStatus,
  PaymentAttemptStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { auditLog } from '../auditLog/service';
import { paymentGateway } from '../payment/gateway';

function amountPaise(amount: number): number {
  return Math.round(amount * 100);
}

export class RefundService {
  async request(
    data: { invoiceId: string; paymentAttemptId?: string; amount: number; reason: string },
    actorId: string,
    req: AuthenticatedRequest
  ) {
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    const refundableAmount = Math.max(0, invoice.paidAmount - invoice.refundedAmount);
    if (data.amount > refundableAmount) {
      throw AppError.unprocessable('Refund amount exceeds the refundable paid amount');
    }

    if (data.paymentAttemptId) {
      const attempt = await prisma.paymentAttempt.findUnique({ where: { id: data.paymentAttemptId } });
      if (!attempt || attempt.invoiceId !== invoice.id || attempt.status !== PaymentAttemptStatus.CAPTURED) {
        throw AppError.unprocessable('A captured payment attempt for this invoice is required');
      }
      const previouslyRequested = await prisma.refund.aggregate({
        where: {
          paymentAttemptId: attempt.id,
          status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.PROCESSING, RefundStatus.PROCESSED] },
        },
        _sum: { amount: true },
      });
      if (data.amount > attempt.amount - (previouslyRequested._sum.amount || 0)) {
        throw AppError.unprocessable('Refund amount exceeds this payment transaction amount');
      }
    } else {
      const [offlinePaid, offlineRefunds] = await Promise.all([
        prisma.offlinePayment.aggregate({
          where: { invoiceId: invoice.id, status: 'VERIFIED' },
          _sum: { amount: true },
        }),
        prisma.refund.aggregate({
          where: {
            invoiceId: invoice.id,
            paymentAttemptId: null,
            status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.PROCESSING, RefundStatus.PROCESSED] },
          },
          _sum: { amount: true },
        }),
      ]);
      const availableOfflineAmount = (offlinePaid._sum.amount || 0) - (offlineRefunds._sum.amount || 0);
      if (data.amount > availableOfflineAmount) {
        throw AppError.unprocessable('A captured payment attempt is required for an online refund');
      }
    }

    const refund = await prisma.refund.create({
      data: { ...data, requestedBy: actorId },
    });
    await this.audit(actorId, AuditAction.REFUND_REQUESTED, refund.id, req);
    return refund;
  }

  async list(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const status = req.query.status ? String(req.query.status) as RefundStatus : undefined;
    const where: Prisma.RefundWhereInput = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.refund.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.refund.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async approve(id: string, actorId: string, req: AuthenticatedRequest) {
    const refund = await this.get(id);
    if (refund.status !== RefundStatus.REQUESTED) throw AppError.conflict('Refund is already reviewed');
    const updated = await prisma.refund.update({
      where: { id },
      data: { status: RefundStatus.APPROVED, approvedBy: actorId, approvedAt: new Date() },
    });
    await this.audit(actorId, AuditAction.REFUND_APPROVED, id, req);
    return updated;
  }

  async reject(id: string, reason: string, actorId: string, req: AuthenticatedRequest) {
    const refund = await this.get(id);
    if (refund.status !== RefundStatus.REQUESTED) throw AppError.conflict('Refund is already reviewed');
    const updated = await prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.REJECTED,
        processedBy: actorId,
        processedAt: new Date(),
        reason: `${refund.reason}\nRejection: ${reason}`,
      },
    });
    await this.audit(actorId, AuditAction.REFUND_PROCESSED, id, req);
    return updated;
  }

  async process(id: string, actorId: string, req: AuthenticatedRequest) {
    const refund = await this.get(id);
    if (refund.status === RefundStatus.PROCESSED) return refund;
    if (refund.status !== RefundStatus.APPROVED && refund.status !== RefundStatus.FAILED) {
      throw AppError.conflict('Refund must be approved before processing');
    }

    const invoice = await prisma.feeInvoice.findUnique({ where: { id: refund.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    const refundableAmount = Math.max(0, invoice.paidAmount - invoice.refundedAmount);
    if (refund.amount > refundableAmount) throw AppError.conflict('Invoice refundable balance changed');

    let gatewayRefundId = refund.gatewayRefundId || undefined;
    await prisma.refund.update({ where: { id }, data: { status: RefundStatus.PROCESSING, processedBy: actorId } });
    try {
      const processingTotals = await prisma.refund.aggregate({
        where: {
          invoiceId: invoice.id,
          status: { in: [RefundStatus.PROCESSING, RefundStatus.PROCESSED] },
        },
        _sum: { amount: true },
      });
      if ((processingTotals._sum.amount || 0) > invoice.paidAmount) {
        throw AppError.conflict('Combined refunds exceed the invoice paid amount');
      }

      if (refund.paymentAttemptId) {
        const [attempt, attemptRefunds] = await Promise.all([
          prisma.paymentAttempt.findUnique({ where: { id: refund.paymentAttemptId } }),
          prisma.refund.aggregate({
            where: {
              paymentAttemptId: refund.paymentAttemptId,
              status: { in: [RefundStatus.PROCESSING, RefundStatus.PROCESSED] },
            },
            _sum: { amount: true },
          }),
        ]);
        if (!attempt || (attemptRefunds._sum.amount || 0) > attempt.amount) {
          throw AppError.conflict('Combined refunds exceed the captured payment amount');
        }
      } else {
        const [offlinePaid, offlineRefunds] = await Promise.all([
          prisma.offlinePayment.aggregate({
            where: { invoiceId: invoice.id, status: 'VERIFIED' },
            _sum: { amount: true },
          }),
          prisma.refund.aggregate({
            where: {
              invoiceId: invoice.id,
              paymentAttemptId: null,
              status: { in: [RefundStatus.PROCESSING, RefundStatus.PROCESSED] },
            },
            _sum: { amount: true },
          }),
        ]);
        if ((offlineRefunds._sum.amount || 0) > (offlinePaid._sum.amount || 0)) {
          throw AppError.conflict('Combined offline refunds exceed verified offline collections');
        }
      }

      if (refund.paymentAttemptId && !gatewayRefundId) {
        const attempt = await prisma.paymentAttempt.findUnique({ where: { id: refund.paymentAttemptId } });
        if (!attempt?.gatewayPaymentId) throw AppError.unprocessable('Captured gateway payment is unavailable');
        const gatewayRefund = await paymentGateway.refundPayment(attempt.gatewayPaymentId, amountPaise(refund.amount), {
          refundId: refund.id,
          invoiceId: invoice.id,
        });
        gatewayRefundId = gatewayRefund.id;
        await prisma.refund.update({ where: { id }, data: { gatewayRefundId } });
      }

      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.feeInvoice.findUnique({ where: { id: invoice.id } });
        if (!current) throw AppError.notFound('Fee invoice not found');
        const refundedAmount = current.refundedAmount + refund.amount;
        const netPaid = Math.max(0, current.paidAmount - refundedAmount);
        const dueAmount = Math.max(0, current.payableAmount - netPaid);
        const status = netPaid === 0 ? InvoiceStatus.REFUNDED : InvoiceStatus.PARTIAL;

        const updatedInvoice = await tx.feeInvoice.updateMany({
          where: {
            id: current.id,
            paidAmount: current.paidAmount,
            refundedAmount: current.refundedAmount,
            dueAmount: current.dueAmount,
          },
          data: { refundedAmount, dueAmount, status },
        });
        if (updatedInvoice.count !== 1) throw AppError.conflict('Invoice balance changed while processing the refund');
        if (refund.paymentAttemptId && refund.amount >= (await tx.paymentAttempt.findUnique({
          where: { id: refund.paymentAttemptId },
          select: { amount: true },
        }))!.amount) {
          await tx.paymentAttempt.update({
            where: { id: refund.paymentAttemptId },
            data: { status: PaymentAttemptStatus.REFUNDED },
          });
        }
        return tx.refund.update({
          where: { id },
          data: {
            status: RefundStatus.PROCESSED,
            processedBy: actorId,
            processedAt: new Date(),
            gatewayRefundId,
          },
        });
      });
      await this.audit(actorId, AuditAction.REFUND_PROCESSED, id, req);
      return result;
    } catch (error) {
      await prisma.refund.update({ where: { id }, data: { status: RefundStatus.FAILED } });
      throw error;
    }
  }

  private async get(id: string) {
    const refund = await prisma.refund.findUnique({ where: { id } });
    if (!refund) throw AppError.notFound('Refund not found');
    return refund;
  }

  private audit(actorId: string, action: AuditAction, entityId: string, req: AuthenticatedRequest) {
    return auditLog({
      actorId,
      action,
      entity: 'Refund',
      entityId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
