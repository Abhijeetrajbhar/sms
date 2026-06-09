import { z } from 'zod';

const feeItemSchema = z.object({
  name: z.string().trim().min(2).max(100),
  amount: z.number().positive(),
  description: z.string().trim().max(300).optional(),
});

export const createStructureSchema = z.object({
  academicYear: z.string().trim().min(4).max(20),
  classId: z.string().trim().min(1),
  section: z.string().trim().max(30).optional(),
  feeType: z.string().trim().min(2).max(80),
  feeItems: z.array(feeItemSchema).min(1),
  cycle: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM']).default('YEARLY'),
  dueDate: z.string().datetime().or(z.string().date()),
  lateFeeRule: z.object({
    type: z.enum(['FIXED', 'PERCENTAGE']),
    value: z.number().nonnegative(),
    graceDays: z.number().int().nonnegative().default(0),
  }).optional(),
  discountRules: z.record(z.unknown()).optional(),
});

export const updateStructureSchema = createStructureSchema.partial();

export const generateInvoiceSchema = z.object({
  structureId: z.string().trim().min(1),
  studentId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  discountAmount: z.number().nonnegative().default(0),
}).refine((value) => value.studentId || value.classId, {
  message: 'studentId or classId is required',
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().datetime().or(z.string().date()).optional(),
  status: z.enum(['CANCELLED', 'EXPIRED']).optional(),
});

export const offlinePaymentSchema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.number().positive(),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI_MANUAL', 'DEMAND_DRAFT']),
  referenceNumber: z.string().trim().max(120).optional(),
  proofFile: z.string().url().optional(),
}).superRefine((value, ctx) => {
  if (value.mode !== 'CASH' && !value.referenceNumber) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referenceNumber'], message: 'Reference number is required for this payment mode' });
  }
});

export const rejectOfflinePaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
