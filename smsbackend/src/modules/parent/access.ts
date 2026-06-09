import { Role } from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';

export type AuthUser = NonNullable<AuthenticatedRequest['user']>;

export async function getParentScope(userId: string) {
  const parent = await prisma.parentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          status: true,
        },
      },
    },
  });
  if (!parent || parent.deletedAt) throw AppError.forbidden('Active parent profile required');

  const children = await prisma.studentProfile.findMany({
    where: {
      parentIds: { has: parent.id },
      deletedAt: null,
      user: { deletedAt: null, status: { notIn: ['INACTIVE', 'SUSPENDED'] } },
    },
    select: { id: true, classId: true },
  });

  return {
    parent,
    children,
    studentIds: children.map((child) => child.id),
    classIds: [...new Set(children.map((child) => child.classId).filter(Boolean) as string[])],
  };
}

export async function assertParentStudentAccess(user: AuthUser, studentId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.PARENT) throw AppError.forbidden('Parent access required');
  const scope = await getParentScope(user.id);
  if (!scope.studentIds.includes(studentId)) {
    throw AppError.forbidden('You can only access records for linked students');
  }
}

export async function assertParentClassAccess(user: AuthUser, classId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.PARENT) throw AppError.forbidden('Parent access required');
  const scope = await getParentScope(user.id);
  if (!scope.classIds.includes(classId)) {
    throw AppError.forbidden('You can only access classes linked to your children');
  }
}
