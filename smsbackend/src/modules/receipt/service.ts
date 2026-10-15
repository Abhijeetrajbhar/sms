import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { assertParentStudentAccess } from '../parent/access';
import { assertInvoiceAccess, getInvoiceScope } from '../payment/access';

export class ReceiptService {
  async listReceipts(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const scope = await getInvoiceScope(req.user!);
    const studentId = req.query.studentId ? String(req.query.studentId) : undefined;

    if (studentId && req.user?.role === 'PARENT') {
      await assertParentStudentAccess(req.user, studentId);
    }
    if (studentId && req.user?.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!student || student.id !== studentId) throw AppError.forbidden('You can only access your own receipts');
    }

    const where: Prisma.ReceiptWhereInput = {
      AND: [scope as Prisma.ReceiptWhereInput, ...(studentId ? [{ studentId }] : [])],
    };
    const [data, total] = await Promise.all([
      prisma.receipt.findMany({ where, orderBy: { issuedAt: 'desc' }, skip, take: limit }),
      prisma.receipt.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getReceipt(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) throw AppError.notFound('Receipt not found');

    const [invoice, student] = await Promise.all([
      prisma.feeInvoice.findUnique({ where: { id: receipt.invoiceId } }),
      prisma.studentProfile.findUnique({
        where: { id: receipt.studentId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          class: { select: { name: true, section: true, academicYear: true } },
        },
      }),
    ]);
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    if (!student) throw AppError.notFound('Student record not found');
    await assertInvoiceAccess(invoice, user);

    return { receipt, invoice, student };
  }
}
