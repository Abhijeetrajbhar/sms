import { Role } from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';

export type AuthUser = NonNullable<AuthenticatedRequest['user']>;

export async function getLoggedInStudent(userId: string) {
  const student = await prisma.studentProfile.findUnique({
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
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          gradeLevel: true,
          academicYear: true,
          room: true,
          teacher: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!student || student.deletedAt) throw AppError.forbidden('Active student profile required');
  return student;
}

export async function assertStudentSelf(user: AuthUser, studentId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.STUDENT) throw AppError.forbidden('Student access required');

  const student = await getLoggedInStudent(user.id);
  if (student.id !== studentId) {
    throw AppError.forbidden('You can only access your own student records');
  }
}

export async function assertStudentClassAccess(user: AuthUser, classId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.STUDENT) throw AppError.forbidden('Student access required');

  const student = await getLoggedInStudent(user.id);
  if (!student.classId || student.classId !== classId) {
    throw AppError.forbidden('You can only access your assigned class');
  }
}
