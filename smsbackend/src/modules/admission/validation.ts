import { z } from 'zod';
import { AdmissionStatus, Gender } from '@prisma/client';

export const createApplicationSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(20).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.nativeEnum(Gender).optional(),
  address: z.string().trim().max(500).optional(),
  desiredClassId: z.string().trim().min(1).optional(),
  academicYear: z.string().trim().min(4).max(20),
  previousSchool: z.string().trim().max(150).optional(),
  documents: z.array(z.object({ name: z.string().min(1), url: z.string().url(), type: z.string().min(1) })).max(20).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(AdmissionStatus),
  reviewNotes: z.string().trim().max(1000).optional(),
});
