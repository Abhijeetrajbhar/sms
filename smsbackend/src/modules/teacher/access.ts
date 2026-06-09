import { Role } from '@prisma/client';
import prisma from '../../config/database';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';

export type AuthUser = NonNullable<AuthenticatedRequest['user']>;

export async function getTeacherScope(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
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
      classes: {
        where: { deletedAt: null },
        select: { id: true, name: true, section: true, academicYear: true, room: true },
      },
      subjectTeachers: {
        where: { status: 'ACTIVE', class: { deletedAt: null } },
        include: {
          class: { select: { id: true, name: true, section: true, academicYear: true, room: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  if (!teacher || teacher.deletedAt) throw AppError.forbidden('Active teacher profile required');

  const classTeacherIds = teacher.classes.map((item) => item.id);
  const subjectClassIds = teacher.subjectTeachers.map((item) => item.classId);
  return {
    teacher,
    classTeacherIds,
    subjectClassIds,
    classIds: [...new Set([...classTeacherIds, ...subjectClassIds])],
    subjectIds: [...new Set(teacher.subjectTeachers.map((item) => item.subjectId))],
  };
}

export async function assertTeacherClassAccess(user: AuthUser, classId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER) throw AppError.forbidden('Teacher access required');
  const scope = await getTeacherScope(user.id);
  if (!scope.classIds.includes(classId)) throw AppError.forbidden('You are not assigned to this class or section');
}

export async function assertClassTeacherAccess(user: AuthUser, classId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER) throw AppError.forbidden('Teacher access required');
  const scope = await getTeacherScope(user.id);
  if (!scope.classTeacherIds.includes(classId)) throw AppError.forbidden('Class teacher permission required');
}

export async function assertTeacherSubjectAccess(user: AuthUser, classId: string, subjectId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER) throw AppError.forbidden('Teacher access required');
  const scope = await getTeacherScope(user.id);
  const assigned = scope.teacher.subjectTeachers.some(
    (item) => item.classId === classId && item.subjectId === subjectId && item.status === 'ACTIVE'
  );
  if (!assigned) throw AppError.forbidden('You are not assigned to this subject for the selected class or section');
}

export async function assertTeacherStudentAccess(user: AuthUser, studentId: string) {
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.TEACHER) throw AppError.forbidden('Teacher access required');
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { classId: true, deletedAt: true },
  });
  if (!student || student.deletedAt) throw AppError.notFound('Student not found');
  if (!student.classId) throw AppError.forbidden('Student is not assigned to a class');
  await assertTeacherClassAccess(user, student.classId);
}

export async function assertTeacherAssignmentOwnership(user: AuthUser, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true, classId: true, subjectId: true, deletedAt: true },
  });
  if (!assignment || assignment.deletedAt) throw AppError.notFound('Assignment not found');
  if (user.role === Role.ADMIN) return assignment;
  const scope = await getTeacherScope(user.id);
  if (assignment.teacherId !== scope.teacher.id) throw AppError.forbidden('You can only access your own assignments');
  return assignment;
}

export async function assertTeacherResultAccess(user: AuthUser, resultId: string) {
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    select: { classId: true, subjectId: true },
  });
  if (!result) throw AppError.notFound('Result not found');
  await assertTeacherSubjectAccess(user, result.classId, result.subjectId);
  return result;
}
