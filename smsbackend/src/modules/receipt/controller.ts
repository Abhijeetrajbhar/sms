import { Response } from 'express';
import PDFDocument from 'pdfkit';
import config from '../../config/env';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ReceiptService } from './service';

const service = new ReceiptService();

interface FeeItem {
  name: string;
  amount: number;
  description?: string;
}

function money(amount: number): string {
  return `INR ${amount.toFixed(2)}`;
}

export const getReceipt = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getReceipt(req.params.receiptId, req.user!) });
});

export const downloadReceipt = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { receipt, invoice, student } = await service.getReceipt(req.params.receiptId, req.user!);
  const items = invoice.feeItems as unknown as FeeItem[];
  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text(config.SCHOOL_NAME, { align: 'center' });
  doc.fontSize(14).text('Fee Payment Receipt', { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(10);
  doc.text(`Receipt: ${receipt.receiptNumber}`);
  doc.text(`Invoice: ${invoice.invoiceNumber}`);
  doc.text(`Issued: ${receipt.issuedAt.toLocaleString('en-IN')}`);
  doc.moveDown();
  doc.text(`Student: ${student.user.firstName} ${student.user.lastName}`);
  doc.text(`Student code: ${student.studentCode}`);
  doc.text(`Class: ${student.class?.name || '-'} ${student.class?.section || invoice.section || ''}`.trim());
  doc.text(`Academic year: ${invoice.academicYear}`);
  doc.moveDown();
  doc.fontSize(12).text('Fee details', { underline: true });
  doc.moveDown(0.5);

  items.forEach((item) => {
    doc.fontSize(10).text(`${item.name}${item.description ? ` - ${item.description}` : ''}`, {
      continued: true,
      width: 400,
    });
    doc.text(money(item.amount), { align: 'right' });
  });

  doc.moveDown();
  doc.text(`Subtotal: ${money(invoice.subtotalAmount)}`, { align: 'right' });
  if (invoice.discountAmount > 0) doc.text(`Discount: -${money(invoice.discountAmount)}`, { align: 'right' });
  if (invoice.lateFeeAmount > 0) doc.text(`Late fee: ${money(invoice.lateFeeAmount)}`, { align: 'right' });
  doc.fontSize(12).text(`Amount received: ${money(receipt.amount)}`, { align: 'right' });
  doc.fontSize(10).text(`Payment mode: ${receipt.paymentMode}`);
  doc.text(`Transaction reference: ${receipt.transactionReference || receipt.gatewayPaymentId || '-'}`);
  doc.moveDown(3);
  doc.text('Authorized signature', { align: 'right' });
  doc.moveDown();
  doc.fontSize(8).fillColor('#666666').text(
    'This is a system-generated receipt. Payment status is confirmed by the school payment records.',
    { align: 'center' }
  );
  doc.end();
});
