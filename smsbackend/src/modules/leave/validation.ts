import { LeaveRequestStatus, LeaveRequestType } from '@prisma/client';
import { z } from 'zod';

export const createLeaveSchema = z.object({
  type: z.nativeEnum(LeaveRequestType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().trim().min(5).max(1000),
}).refine((value) => value.endDate >= value.startDate, { path: ['endDate'], message: 'End date must be on or after start date' });

export const reviewLeaveSchema = z.object({
  status: z.enum([LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED]),
  reviewNotes: z.string().trim().max(1000).optional(),
});
