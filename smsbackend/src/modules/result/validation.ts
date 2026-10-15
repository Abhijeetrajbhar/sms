import { z } from 'zod';

const marksContext = {
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  examType: z.string().trim().min(2).max(100),
  academicYear: z.string().trim().min(4).max(20),
  term: z.string().trim().min(1).max(50),
};

export const marksStudentsQuerySchema = z.object({
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  examType: z.string().trim().min(2).max(100).optional(),
  academicYear: z.string().trim().min(4).max(20).optional(),
  term: z.string().trim().min(1).max(50).optional(),
});

export const saveDraftSchema = z.object({
  ...marksContext,
  entries: z.array(z.object({
    studentId: z.string().trim().min(1),
    marksObtained: z.coerce.number().nonnegative(),
    maxMarks: z.coerce.number().positive().optional(),
    remarks: z.string().trim().max(500).optional(),
  })).min(1),
});

export const submitFinalSchema = z.object(marksContext);

const resultEntrySchema = z.object({
  studentId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  marksObtained: z.coerce.number().nonnegative(),
  maxMarks: z.coerce.number().positive().optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const createResultSchema = z.object({
  studentId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  examType: z.string().trim().min(2).max(100),
  academicYear: z.string().trim().min(4).max(20),
  term: z.string().trim().min(1).max(50),
  marksObtained: z.coerce.number().nonnegative(),
  maxMarks: z.coerce.number().positive().optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const bulkCreateResultSchema = z.object({
  classId: z.string().trim().min(1),
  examType: z.string().trim().min(2).max(100),
  academicYear: z.string().trim().min(4).max(20),
  term: z.string().trim().min(1).max(50),
  entries: z.array(resultEntrySchema).min(1),
});

export const updateResultSchema = z.object({
  marksObtained: z.coerce.number().nonnegative(),
  remarks: z.string().trim().max(500).optional(),
});

export const publishResultsSchema = z.object({
  classId: z.string().trim().min(1),
  examType: z.string().trim().min(2).max(100),
  academicYear: z.string().trim().min(4).max(20),
  term: z.string().trim().min(1).max(50),
});
