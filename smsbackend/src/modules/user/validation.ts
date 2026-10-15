import { Role } from '@prisma/client';
import { z } from 'zod';
import { ADMIN_PERMISSIONS } from '../admin/permissions';

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  phone: z.string().trim().regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.nativeEnum(Role),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional(),
  isSuperAdmin: z.boolean().optional(),
  deferInvitation: z.boolean().optional(),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)),
  isSuperAdmin: z.boolean().optional(),
});
