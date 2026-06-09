import { z } from 'zod';

export const requestRefundSchema = z.object({
  invoiceId: z.string().trim().min(1),
  paymentAttemptId: z.string().trim().min(1).optional(),
  amount: z.coerce.number().positive().max(100000000),
  reason: z.string().trim().min(5).max(500),
});

export const rejectRefundSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
