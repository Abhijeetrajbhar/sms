import { AttendanceStatus } from '@prisma/client';
import { z } from 'zod';

const objectId = z.string().trim().min(1);

export const bulkAttendanceSchema = z.object({
  classId: objectId,
  subjectId: objectId.optional(),
  date: z.string().trim().min(1),
  entries: z.array(z.object({
    studentId: objectId,
    status: z.nativeEnum(AttendanceStatus),
    remarks: z.string().trim().max(500).optional(),
  })).min(1),
});

export const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatus),
  remarks: z.string().trim().max(500).optional(),
});
