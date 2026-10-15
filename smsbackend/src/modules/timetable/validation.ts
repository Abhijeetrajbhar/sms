import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm format');

export const createTimetableSchema = z.object({
  name: z.string().trim().min(2).max(100),
  classId: z.string().trim().min(1),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format'),
});

export const createTimetableSlotSchema = z.object({
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  teacherId: z.string().trim().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  room: z.string().trim().max(100).optional().or(z.literal('')),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});
