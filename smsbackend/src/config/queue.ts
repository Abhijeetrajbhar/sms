import { Queue, Worker, QueueEvents, Processor, JobsOptions } from 'bullmq';
import config from './env';
import logger from '../utils/logger';

const connection = {
  url: config.REDIS_URL,
  ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
};

type AppQueue = {
  name: string;
  add: (name: string, data?: unknown, opts?: JobsOptions) => Promise<unknown>;
  close: () => Promise<void>;
};

function createNoopQueue(name: string): AppQueue {
  return {
    name,
    async add(jobName: string) {
      logger.warn(`[Queue:${name}] Skipped job "${jobName}" because queues are disabled`);
      return null;
    },
    async close() {
      return undefined;
    },
  };
}

function createQueue(name: string): AppQueue {
  return config.ENABLE_QUEUES
    ? new Queue(name, { connection })
    : createNoopQueue(name);
}

// Queues
export const reportCardQueue = createQueue('reportCard');
export const notificationQueue = createQueue('notification');
export const analyticsQueue = createQueue('analytics');
export const emailQueue = createQueue('email');
export const paymentReconciliationQueue = createQueue('paymentReconciliation');

// Queue Events (for logging)
const queues = [reportCardQueue, notificationQueue, analyticsQueue, emailQueue, paymentReconciliationQueue];
const queueEvents: QueueEvents[] = [];

if (config.ENABLE_QUEUES) {
  queues.forEach((queue) => {
    const events = new QueueEvents(queue.name, { connection });
    queueEvents.push(events);
    events.on('completed', ({ jobId }) =>
      logger.info(`[Queue:${queue.name}] Job ${jobId} completed`)
    );
    events.on('failed', ({ jobId, failedReason }) =>
      logger.error(`[Queue:${queue.name}] Job ${jobId} failed: ${failedReason}`)
    );
  });
} else {
  logger.warn('BullMQ queues disabled. Background jobs will be skipped.');
}

export function createWorker(
  queueName: string,
  processor: Processor
): Worker | null {
  if (!config.ENABLE_QUEUES) {
    logger.warn(`Worker [${queueName}] not started because queues are disabled`);
    return null;
  }

  const worker = new Worker(queueName, processor, { connection });
  worker.on('error', (err) => logger.error(`Worker error [${queueName}]:`, err));
  return worker;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    ...queues.map((q) => q.close()),
    ...queueEvents.map((e) => e.close()),
  ]);
  logger.info('BullMQ queues closed');
}
