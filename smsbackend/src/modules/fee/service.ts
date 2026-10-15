// service.ts
import prisma from '../../config/database';
import { FeeStatus } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { notificationQueue } from '../../config/queue';
import { cacheDelPattern } from '../../config/redis';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class FeeService {
  private validateFeeInput(amount: number, dueDate: string): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw AppError.badRequest('Fee amount must be greater than zero');
    }
    if (Number.isNaN(new Date(dueDate).getTime())) {
      throw AppError.badRequest('A valid due date is required');
    }
  }

  async createFee(data: {
    studentId: string;
    classId: string;
    title: string;
    description?: string;
    amount: number;
    dueDate: string;
    academicYear: string;
    term: string;
  }) {
    this.validateFeeInput(data.amount, data.dueDate);
    const student = await prisma.studentProfile.findUnique({ where: { id: data.studentId } });
    if (!student || student.deletedAt) throw AppError.notFound('Student not found');
    if (student.classId !== data.classId) throw AppError.unprocessable('Student does not belong to the selected class or section');
    const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Class not found');
    const fee = await prisma.fee.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    await cacheDelPattern('analytics:*');
    return fee;
  }

  async createClassFees(data: {
    classId: string;
    title: string;
    description?: string;
    amount: number;
    dueDate: string;
    academicYear: string;
    term: string;
  }) {
    this.validateFeeInput(data.amount, data.dueDate);
    const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Class not found');
    const students = await prisma.studentProfile.findMany({
      where: { classId: data.classId, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!students.length) throw AppError.badRequest('No students in this class');

    const fees = await prisma.$transaction(
      students.map((s) =>
        prisma.fee.create({
          data: {
            studentId: s.id,
            classId: data.classId,
            title: data.title,
            description: data.description,
            amount: data.amount,
            dueDate: new Date(data.dueDate),
            academicYear: data.academicYear,
            term: data.term,
          },
        })
      )
    );

    // Notify students and parents
    await notificationQueue.add('fee:created', {
      studentUserIds: students.map((s) => s.userId),
      feeTitle: data.title,
      amount: data.amount,
      dueDate: data.dueDate,
    });

    await cacheDelPattern('analytics:*');
    return { created: fees.length };
  }

  async recordPayment(feeId: string, data: {
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    remarks?: string;
  }) {
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw AppError.badRequest('Payment amount must be greater than zero');
    }
    const fee = await prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) throw AppError.notFound('Fee not found');
    if (fee.status === FeeStatus.PAID || fee.status === FeeStatus.WAIVED) {
      throw AppError.badRequest('Fee is already fully paid or waived');
    }
    if (data.amount > fee.amount - fee.paidAmount) {
      throw AppError.badRequest('Payment exceeds remaining balance');
    }

    const newPaid = fee.paidAmount + data.amount;
    const newStatus =
      newPaid >= fee.amount
        ? FeeStatus.PAID
        : newPaid > 0
        ? FeeStatus.PARTIAL
        : fee.status;

    const { payment, updatedFee } = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          feeId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          remarks: data.remarks,
        },
      });
      const updateResult = await tx.fee.updateMany({
        where: {
          id: feeId,
          paidAmount: fee.paidAmount,
          status: fee.status,
        },
        data: { paidAmount: newPaid, status: newStatus },
      });
      if (updateResult.count !== 1) {
        throw AppError.conflict('Fee balance changed while recording the payment');
      }
      const updatedFee = await tx.fee.findUniqueOrThrow({
        where: { id: feeId },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
      return { payment, updatedFee };
    });

    await cacheDelPattern('analytics:*');
    return { payment, fee: updatedFee };
  }

  async waiveFee(feeId: string, reason: string) {
    if (!reason?.trim()) throw AppError.badRequest('Waiver reason is required');
    const fee = await prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) throw AppError.notFound('Fee not found');
    if (fee.status === FeeStatus.PAID) throw AppError.badRequest('Paid fees cannot be waived');

    const waived = await prisma.fee.update({
      where: { id: feeId },
      data: { status: FeeStatus.WAIVED, waiverReason: reason.trim() },
    });
    await cacheDelPattern('analytics:*');
    return waived;
  }

  async getFees(req: AuthenticatedRequest) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { status, classId, studentId, academicYear } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as FeeStatus;
    if (classId) where.classId = classId as string;
    if (studentId) where.studentId = studentId as string;
    if (academicYear) where.academicYear = academicYear as string;

    if (req.user?.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!student) return { data: [], meta: buildPaginationMeta(0, page, limit) };
      if (studentId && studentId !== student.id) {
        throw AppError.forbidden('You can only access your own fee records');
      }
      where.studentId = student.id;
    }

    if (req.user?.role === 'PARENT') {
      const parent = await prisma.parentProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!parent) return { data: [], meta: buildPaginationMeta(0, page, limit) };
      const linkedStudents = await prisma.studentProfile.findMany({
        where: {
          parentIds: { has: parent.id },
          deletedAt: null,
          user: { deletedAt: null, status: { notIn: ['INACTIVE', 'SUSPENDED'] } },
        },
        select: { id: true },
      });
      const linkedIds = linkedStudents.map((student) => student.id);
      if (studentId && !linkedIds.includes(studentId as string)) {
        throw AppError.forbidden('You can only access fee records for linked students');
      }
      where.studentId = studentId || { in: linkedIds };
    }

    const [fees, total] = await Promise.all([
      prisma.fee.findMany({
        where,
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
          class: { select: { name: true, section: true } },
          payments: { orderBy: { paidAt: 'desc' }, take: 5 },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.fee.count({ where }),
    ]);

    return { data: fees, meta: buildPaginationMeta(total, page, limit) };
  }

  async updateOverdueFees() {
    const updated = await prisma.fee.updateMany({
      where: {
        status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
        dueDate: { lt: new Date() },
      },
      data: { status: FeeStatus.OVERDUE },
    });
    await cacheDelPattern('analytics:*');
    return updated;
  }

  async getCollectionSummary() {
    const [total, collected, pending, overdue] = await Promise.all([
      prisma.fee.aggregate({ _sum: { amount: true } }),
      prisma.fee.aggregate({ _sum: { paidAmount: true } }),
      prisma.fee.count({ where: { status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] } } }),
      prisma.fee.count({ where: { status: FeeStatus.OVERDUE } }),
    ]);

    return {
      totalAmount: total._sum.amount || 0,
      collectedAmount: collected._sum.paidAmount || 0,
      pendingCount: pending,
      overdueCount: overdue,
      collectionRate:
        total._sum.amount
          ? Math.round(((collected._sum.paidAmount || 0) / total._sum.amount) * 100)
          : 0,
    };
  }
}
