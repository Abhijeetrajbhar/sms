import { z } from 'zod';

export const teacherRemarkSchema = z.object({
  academicYear: z.string().trim().min(4).max(20),
  term: z.string().trim().min(1).max(50),
});

export const generateQuestionsSchema = z.object({
  subject: z.string().trim().min(2).max(100),
  topic: z.string().trim().min(2).max(150),
  gradeLevel: z.string().trim().min(1).max(50),
  count: z.coerce.number().int().min(1).max(20).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});
