import { Job } from 'bullmq';
import prisma from '../config/database';
import config from '../config/env';
import { createWorker, paymentReconciliationQueue } from '../config/queue';
import { PaymentService } from '../modules/payment/service';
import logger from '../utils/logger';

const service = new PaymentService();

export async function schedulePaymentReconciliation(): Promise<void> {
  await paymentReconciliationQueue.add('reconcile-pending-payments', {}, {
    jobId: 'payment-reconciliation',
    repeat: { every: config.PAYMENT_RECONCILIATION_INTERVAL_MS },
    removeOnComplete: 20,
    removeOnFail: 50,
  });
}

export function startPaymentReconciliationWorker() {
  return createWorker('paymentReconciliation', async (_job: Job) => {
    const attempts = await prisma.paymentAttempt.findMany({
      where: { status: { in: ['CREATED', 'PENDING', 'AUTHORIZED'] } },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { id: true },
    });

    const results = await Promise.allSettled(attempts.map((attempt) => service.reconcileAttempt(attempt.id)));
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed) logger.warn(`[PaymentReconciliation] ${failed} of ${results.length} attempts could not be reconciled`);
    return { checked: results.length, failed };
  });
}
