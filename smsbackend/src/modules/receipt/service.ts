import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import { assertInvoiceAccess } from '../payment/access';

export class ReceiptService {
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
