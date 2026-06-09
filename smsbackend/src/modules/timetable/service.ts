// service.ts
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertTeacherClassAccess, getTeacherScope } from '../teacher/access';
import { assertParentClassAccess } from '../parent/access';
import { assertStudentClassAccess } from '../student/access';

export class TimetableService {
  async createTimetable(data: { name: string; classId: string; academicYear: string }) {
    const existing = await prisma.timetable.findFirst({
      where: { classId: data.classId, academicYear: data.academicYear },
    });
    if (existing) throw AppError.conflict('Timetable already exists for this class and year');

    return prisma.timetable.create({ data });
  }

  async addSlot(timetableId: string, data: {
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    // Validate teacher time conflict
    const teacherConflict = await prisma.timetableSlot.findFirst({
      where: {
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        timetable: { isActive: true },
        OR: [
          { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
          { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } },
          { startTime: { gte: data.startTime }, endTime: { lte: data.endTime } },
        ],
      },
    });
    if (teacherConflict) throw AppError.conflict('Teacher has a conflicting slot at this time');

    // Validate class time conflict
    const classConflict = await prisma.timetableSlot.findFirst({
      where: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        timetable: { isActive: true },
        OR: [
          { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
          { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } },
          { startTime: { gte: data.startTime }, endTime: { lte: data.endTime } },
        ],
      },
    });
    if (classConflict) throw AppError.conflict('Class already has a slot at this time');

    return prisma.timetableSlot.create({
      data: { timetableId, ...data },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async getClassTimetable(classId: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    let teacherScope: Awaited<ReturnType<typeof getTeacherScope>> | undefined;
    if (user?.role === 'TEACHER') {
      await assertTeacherClassAccess(user, classId);
      teacherScope = await getTeacherScope(user.id);
    }
    if (user?.role === 'PARENT') await assertParentClassAccess(user, classId);
    if (user?.role === 'STUDENT') await assertStudentClassAccess(user, classId);
    const isClassTeacher = teacherScope?.classTeacherIds.includes(classId) ?? false;
    const timetable = await prisma.timetable.findFirst({
      where: { classId, isActive: true },
      include: {
        slots: {
          where: !isClassTeacher && teacherScope ? { teacherId: teacherScope.teacher.id } : undefined,
          include: {
            subject: { select: { name: true, code: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    if (!timetable) throw AppError.notFound('No active timetable found for this class');
    return timetable;
  }

  async getTeacherTimetable(teacherUserId: string) {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
    if (!teacher) throw AppError.notFound('Teacher profile not found');

    return prisma.timetableSlot.findMany({
      where: { teacherId: teacher.id, timetable: { isActive: true } },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true, section: true } },
        timetable: { select: { academicYear: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getTeacherToday(teacherUserId: string) {
    const dayOfWeek = (new Date().getDay() + 6) % 7;
    const schedule = await this.getTeacherTimetable(teacherUserId);
    return schedule.filter((slot) => slot.dayOfWeek === dayOfWeek);
  }

  async deleteSlot(slotId: string) {
    const slot = await prisma.timetableSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw AppError.notFound('Timetable slot not found');
    return prisma.timetableSlot.delete({ where: { id: slotId } });
  }
}
