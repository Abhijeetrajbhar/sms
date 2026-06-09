import { FeeInvoice, Role } from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';

export async function assertInvoiceAccess(
  invoice: Pick<FeeInvoice, 'studentId'>,
  user: NonNullable<AuthenticatedRequest['user']>
): Promise<void> {
  if (user.role === Role.ADMIN) return;

  if (user.role === Role.STUDENT) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, deletedAt: true },
    });
    if (!student || student.deletedAt || student.id !== invoice.studentId) {
      throw AppError.forbidden('You can only access your own fee invoices');
    }
    return;
  }

  if (user.role === Role.PARENT) {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt) throw AppError.forbidden('Parent profile required');

    const linked = await prisma.studentProfile.findFirst({
      where: {
        id: invoice.studentId,
        parentIds: { has: parent.id },
        deletedAt: null,
        user: { deletedAt: null, status: { notIn: ['INACTIVE', 'SUSPENDED'] } },
      },
      select: { id: true },
    });
    if (!linked) throw AppError.forbidden('You can only access invoices for linked students');
    return;
  }

  throw AppError.forbidden('Your role does not have payment access');
}

export async function getInvoiceScope(user: NonNullable<AuthenticatedRequest['user']>): Promise<Record<string, unknown>> {
  if (user.role === Role.ADMIN) return {};

  if (user.role === Role.STUDENT) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, deletedAt: true },
    });
    return student && !student.deletedAt ? { studentId: student.id } : { studentId: '__none__' };
  }

  if (user.role === Role.PARENT) {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt) return { studentId: '__none__' };
    const students = await prisma.studentProfile.findMany({
      where: {
        parentIds: { has: parent.id },
        deletedAt: null,
        user: { deletedAt: null, status: { notIn: ['INACTIVE', 'SUSPENDED'] } },
      },
      select: { id: true },
    });
    return { studentId: { in: students.map((student) => student.id) } };
  }

  throw AppError.forbidden('Your role does not have payment access');
}
