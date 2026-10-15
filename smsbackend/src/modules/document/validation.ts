import { StudentDocumentStatus } from '@prisma/client';
import { z } from 'zod';

export const uploadStudentDocumentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  expiresAt: z.coerce.date().optional(),
});

export const reviewStudentDocumentSchema = z.object({
  status: z.enum([StudentDocumentStatus.VERIFIED, StudentDocumentStatus.REJECTED]),
  reviewNotes: z.string().trim().max(1000).optional(),
});
