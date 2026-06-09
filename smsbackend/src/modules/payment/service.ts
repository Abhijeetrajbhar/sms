import crypto from 'crypto';
import {
  AuditAction,
  InvoiceStatus,
  PaymentAttemptStatus,
  NotificationType,
  Prisma,
  WebhookProcessStatus,
} from '@prisma/client';
import prisma from '../../config/database';
import config from '../../config/env';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { auditLog } from '../auditLog/service';
import { assertInvoiceAccess, getInvoiceScope } from './access';
import { GatewayPayment, paymentGateway, sha256 } from './gateway';
import { assertParentStudentAccess } from '../parent/access';
import { NotificationService } from '../notification/service';

const ACTIVE_STATUSES: PaymentAttemptStatus[] = [
  PaymentAttemptStatus.CREATED,
  PaymentAttemptStatus.PENDING,
  PaymentAttemptStatus.AUTHORIZED,
];
const notificationService = new NotificationService();

function amountPaise(amount: number): number {
  return Math.round(amount * 100);
}

function receiptNumber(): string {
  return `RCT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export class PaymentService {
  async createOrder(invoiceId: string, idempotencyKey: string, user: NonNullable<AuthenticatedRequest['user']>, req: AuthenticatedRequest) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 150) {
      throw AppError.badRequest('A valid Idempotency-Key header is required');
    }

    const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    await assertInvoiceAccess(invoice, user);
    const student = await prisma.studentProfile.findUnique({
      where: { id: invoice.studentId },
      select: { deletedAt: true, user: { select: { status: true, deletedAt: true } } },
    });
    if (!student || student.deletedAt || student.user.deletedAt || ['INACTIVE', 'SUSPENDED'].includes(student.user.status)) {
      throw AppError.unprocessable('Online payment is unavailable for an inactive student');
    }
    if (user.role === 'STUDENT' && !config.STUDENT_ONLINE_PAYMENTS_ENABLED) {
      throw AppError.forbidden('Student online payments are disabled for this school');
    }
    const terminalStatuses: InvoiceStatus[] = [
      InvoiceStatus.PAID,
      InvoiceStatus.REFUNDED,
      InvoiceStatus.CANCELLED,
      InvoiceStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(invoice.status)) {
      throw AppError.unprocessable(`Invoice is ${invoice.status.toLowerCase()} and cannot be paid`);
    }
    if (invoice.dueAmount <= 0) throw AppError.conflict('Invoice is already fully paid');

    const existingByKey = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      if (existingByKey.userId !== user.id || existingByKey.invoiceId !== invoice.id) {
        throw AppError.conflict('Idempotency key is already in use');
      }
      return this.orderResponse(existingByKey);
    }

    const active = await prisma.paymentAttempt.findFirst({
      where: { invoiceId: invoice.id, activeInvoiceKey: invoice.id, status: { in: ACTIVE_STATUSES }, expiresAt: { gt: new Date() } },
    });
    if (active) return this.orderResponse(active);

    await prisma.paymentAttempt.updateMany({
      where: { invoiceId: invoice.id, activeInvoiceKey: invoice.id, expiresAt: { lte: new Date() } },
      data: { status: PaymentAttemptStatus.EXPIRED, activeInvoiceKey: `${invoice.id}:expired:${Date.now()}` },
    });

    let attempt;
    try {
      attempt = await prisma.paymentAttempt.create({
        data: {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          userId: user.id,
          idempotencyKey,
          activeInvoiceKey: invoice.id,
          amount: invoice.dueAmount,
          currency: 'INR',
          expiresAt: new Date(Date.now() + config.PAYMENT_ORDER_TTL_MINUTES * 60 * 1000),
          metadata: { invoiceNumber: invoice.invoiceNumber } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const competing = await prisma.paymentAttempt.findFirst({
        where: { invoiceId: invoice.id, activeInvoiceKey: invoice.id, status: { in: ACTIVE_STATUSES } },
      });
      if (competing) return this.orderResponse(competing);
      throw error;
    }

    try {
      const order = await paymentGateway.createOrder({
        amountPaise: amountPaise(attempt.amount),
        currency: attempt.currency,
        receipt: invoice.invoiceNumber,
        notes: { invoiceId: invoice.id, attemptId: attempt.id, studentId: invoice.studentId },
      });
      const updated = await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { gatewayOrderId: order.id, status: PaymentAttemptStatus.PENDING },
      });
      await prisma.feeInvoice.updateMany({
        where: { id: invoice.id, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.FAILED] } },
        data: { status: InvoiceStatus.PENDING },
      });
      await this.audit(user.id, AuditAction.PAYMENT_ORDER_CREATED, 'PaymentAttempt', attempt.id, req);
      return this.orderResponse(updated);
    } catch (error) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.FAILED,
          activeInvoiceKey: `${invoice.id}:${attempt.id}:failed`,
          failureReason: 'Payment gateway order creation failed',
        },
      });
      throw error;
    }
  }

  async verifyCheckout(data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, user: NonNullable<AuthenticatedRequest['user']>, req: AuthenticatedRequest) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { gatewayOrderId: data.razorpay_order_id } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: attempt.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    await assertInvoiceAccess(invoice, user);

    if (!paymentGateway.verifyCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
      throw AppError.badRequest('Invalid payment signature');
    }
    const payment = await paymentGateway.getPayment(data.razorpay_payment_id);
    if (payment.order_id !== attempt.gatewayOrderId) throw AppError.badRequest('Payment order mismatch');
    if (payment.status === 'captured') {
      return this.processCapturedPayment(attempt.id, payment);
    }
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        gatewayPaymentId: payment.id,
        gatewaySignatureHash: sha256(data.razorpay_signature),
        status: payment.status === 'authorized' ? PaymentAttemptStatus.AUTHORIZED : PaymentAttemptStatus.PENDING,
      },
    });
    await this.audit(user.id, AuditAction.PAYMENT_VERIFIED, 'PaymentAttempt', attempt.id, req);
    return { status: 'PENDING', message: 'Payment is verified and awaiting capture confirmation' };
  }

  async refreshStatus(attemptId: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: attempt.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    await assertInvoiceAccess(invoice, user);
    return this.reconcileAttempt(attemptId);
  }

  async reconcileAttempt(attemptId: string) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    if (attempt.status === PaymentAttemptStatus.CAPTURED) return attempt;
    if (!attempt.gatewayOrderId) {
      if (attempt.expiresAt <= new Date()) {
        return prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: PaymentAttemptStatus.EXPIRED,
            activeInvoiceKey: `${attempt.invoiceId}:${attempt.id}:expired`,
          },
        });
      }
      throw AppError.unprocessable('Payment order is not ready');
    }

    const payments = await paymentGateway.getOrderPayments(attempt.gatewayOrderId);
    const captured = payments.items.find((payment) => payment.status === 'captured');
    if (captured) return this.processCapturedPayment(attempt.id, captured);
    const failed = payments.items.find((payment) => payment.status === 'failed');
    if (failed) return this.processFailedPayment(attempt.id, 'Payment failed at gateway');
    if (attempt.expiresAt <= new Date()) {
      return prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.EXPIRED,
          activeInvoiceKey: `${attempt.invoiceId}:${attempt.id}:expired`,
        },
      });
    }
    return attempt;
  }

  async history(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const scope = await getInvoiceScope(req.user!);
    const studentId = req.query.studentId ? String(req.query.studentId) : undefined;
    if (studentId && req.user?.role === 'PARENT') {
      await assertParentStudentAccess(req.user, studentId);
    }
    if (studentId && req.user?.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!student || student.id !== studentId) throw AppError.forbidden('You can only access your own payment history');
    }
    const where: Prisma.PaymentAttemptWhereInput = {
      AND: [scope as Prisma.PaymentAttemptWhereInput, ...(studentId ? [{ studentId }] : [])],
    };
    const [attempts, total] = await Promise.all([
      prisma.paymentAttempt.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.paymentAttempt.count({ where }),
    ]);
    const receipts = attempts.length
      ? await prisma.receipt.findMany({
        where: { paymentAttemptId: { in: attempts.map((attempt) => attempt.id) } },
        select: { id: true, paymentAttemptId: true, receiptNumber: true },
      })
      : [];
    const receiptsByAttempt = new Map(receipts.map((receipt) => [receipt.paymentAttemptId, receipt]));
    const data = attempts.map((attempt) => ({
      ...attempt,
      receipt: receiptsByAttempt.get(attempt.id) || null,
    }));
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getAttempt(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    const invoice = await prisma.feeInvoice.findUnique({ where: { id: attempt.invoiceId } });
    if (!invoice) throw AppError.notFound('Fee invoice not found');
    await assertInvoiceAccess(invoice, user);
    return attempt;
  }

  async handleWebhook(rawBody: Buffer, signature: string, headerEventId?: string) {
    if (!signature || !paymentGateway.verifyWebhookSignature(rawBody, signature)) {
      throw AppError.unauthorized('Invalid webhook signature');
    }
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: { payment?: { entity?: GatewayPayment }; refund?: { entity?: { id?: string } } };
    };
    const payment = payload.payload?.payment?.entity;
    const eventId = headerEventId || `${payload.event || 'unknown'}:${payment?.id || sha256(rawBody)}`;

    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType: payload.event || 'unknown',
          rawPayloadHash: sha256(rawBody),
        },
      });
    } catch {
      return { duplicate: true };
    }

    try {
      if (payment?.order_id && payload.event === 'payment.captured') {
        const attempt = await prisma.paymentAttempt.findUnique({ where: { gatewayOrderId: payment.order_id } });
        if (attempt) await this.processCapturedPayment(attempt.id, payment);
      } else if (payment?.order_id && payload.event === 'payment.failed') {
        const attempt = await prisma.paymentAttempt.findUnique({ where: { gatewayOrderId: payment.order_id } });
        if (attempt) await this.processFailedPayment(attempt.id, 'Payment failed at gateway');
      }
      await prisma.paymentWebhookEvent.update({
        where: { eventId },
        data: { processedStatus: WebhookProcessStatus.PROCESSED, processedAt: new Date() },
      });
      return { duplicate: false };
    } catch (error) {
      await prisma.paymentWebhookEvent.update({
        where: { eventId },
        data: {
          processedStatus: WebhookProcessStatus.FAILED,
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Webhook processing failed',
        },
      });
      throw error;
    }
  }

  async processCapturedPayment(attemptId: string, payment: GatewayPayment) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    if (attempt.status === PaymentAttemptStatus.CAPTURED) {
      return prisma.receipt.findUnique({ where: { sourceKey: `attempt:${attempt.id}` } });
    }
    if (payment.status !== 'captured') throw AppError.unprocessable('Payment is not captured');
    if (payment.order_id !== attempt.gatewayOrderId) throw AppError.badRequest('Payment order mismatch');
    if (payment.amount !== amountPaise(attempt.amount) || payment.currency !== attempt.currency) {
      throw AppError.badRequest('Payment amount or currency mismatch');
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findUnique({ where: { id: attempt.invoiceId } });
      if (!invoice) throw AppError.notFound('Fee invoice not found');
      if (attempt.amount > invoice.dueAmount) throw AppError.conflict('Invoice balance changed before payment confirmation');
      const paidAmount = invoice.paidAmount + attempt.amount;
      const dueAmount = Math.max(0, invoice.payableAmount - paidAmount);
      const updated = await tx.feeInvoice.updateMany({
        where: { id: invoice.id, paidAmount: invoice.paidAmount, dueAmount: invoice.dueAmount },
        data: { paidAmount, dueAmount, status: dueAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL },
      });
      if (updated.count !== 1) throw AppError.conflict('Invoice was updated by another payment; retry verification');
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          gatewayPaymentId: payment.id,
          status: PaymentAttemptStatus.CAPTURED,
          verifiedAt: new Date(),
          activeInvoiceKey: `${attempt.invoiceId}:${attempt.id}:captured`,
        },
      });
      return tx.receipt.create({
        data: {
          receiptNumber: receiptNumber(),
          sourceKey: `attempt:${attempt.id}`,
          invoiceId: invoice.id,
          paymentAttemptId: attempt.id,
          studentId: invoice.studentId,
          amount: attempt.amount,
          paymentMode: payment.method || 'ONLINE',
          gatewayPaymentId: payment.id,
          transactionReference: payment.id,
          issuedBy: attempt.userId,
        },
      });
    });
    await auditLog({ actorId: attempt.userId, action: AuditAction.PAYMENT_VERIFIED, entity: 'PaymentAttempt', entityId: attempt.id, metadata: { receiptId: result.id } });
    await auditLog({ actorId: attempt.userId, action: AuditAction.RECEIPT_ISSUED, entity: 'Receipt', entityId: result.id });
    await notificationService.createNotification({
      userId: attempt.userId,
      type: NotificationType.GENERAL,
      title: 'Payment Verified',
      message: `Payment of INR ${attempt.amount.toFixed(2)} was verified. Receipt ${result.receiptNumber} is available.`,
      metadata: { invoiceId: attempt.invoiceId, receiptId: result.id },
    }).catch(() => undefined);
    return result;
  }

  async processFailedPayment(attemptId: string, reason: string) {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw AppError.notFound('Payment attempt not found');
    if (attempt.status === PaymentAttemptStatus.CAPTURED) return attempt;
    if (attempt.status === PaymentAttemptStatus.FAILED) return attempt;
    const updated = await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: PaymentAttemptStatus.FAILED,
        failureReason: reason.slice(0, 500),
        activeInvoiceKey: `${attempt.invoiceId}:${attempt.id}:failed`,
      },
    });
    await prisma.feeInvoice.updateMany({
      where: { id: attempt.invoiceId, status: InvoiceStatus.PENDING },
      data: { status: InvoiceStatus.FAILED },
    });
    await auditLog({ actorId: attempt.userId, action: AuditAction.PAYMENT_FAILED, entity: 'PaymentAttempt', entityId: attempt.id });
    await notificationService.createNotification({
      userId: attempt.userId,
      type: NotificationType.GENERAL,
      title: 'Payment Failed',
      message: 'The fee payment was not completed. You can safely retry from the invoice.',
      metadata: { invoiceId: attempt.invoiceId, paymentAttemptId: attempt.id },
    }).catch(() => undefined);
    return updated;
  }

  private orderResponse(attempt: {
    id: string;
    invoiceId: string;
    gatewayOrderId: string | null;
    amount: number;
    currency: string;
    status: PaymentAttemptStatus;
    expiresAt: Date;
  }) {
    return {
      attemptId: attempt.id,
      invoiceId: attempt.invoiceId,
      gateway: paymentGateway.name,
      keyId: paymentGateway.getPublicKey(),
      orderId: attempt.gatewayOrderId,
      amount: amountPaise(attempt.amount),
      displayAmount: attempt.amount,
      currency: attempt.currency,
      status: attempt.status,
      expiresAt: attempt.expiresAt,
    };
  }

  private audit(actorId: string, action: AuditAction, entity: string, entityId: string, req: AuthenticatedRequest) {
    return auditLog({ actorId, action, entity, entityId, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }
}
