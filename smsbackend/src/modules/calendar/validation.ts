import { AcademicCalendarEventType } from '@prisma/client';
import { z } from 'zod';

const eventFields = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  type: z.nativeEnum(AcademicCalendarEventType),
  academicYear: z.string().trim().min(4).max(20),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  classId: z.string().trim().min(1).optional(),
  isPublished: z.coerce.boolean().optional(),
});

const eventSchema = eventFields.refine((data) => data.endDate >= data.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });

export const createCalendarEventSchema = eventSchema;
export const updateCalendarEventSchema = eventFields.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
