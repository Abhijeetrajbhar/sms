import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(80),
  section: z.string().trim().min(1).max(30),
  gradeLevel: z.string().trim().min(1).max(30),
  academicYear: z.string().trim().min(4).max(20),
  teacherId: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().min(1).max(300).optional(),
  room: z.string().trim().max(80).optional(),
});

export const updateClassSchema = createClassSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30),
  description: z.string().trim().max(500).optional(),
  credits: z.coerce.number().int().min(1).max(20).optional(),
});

export const updateSubjectSchema = createSubjectSchema.omit({ code: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);
