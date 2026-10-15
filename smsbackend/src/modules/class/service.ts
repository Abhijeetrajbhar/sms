// service.ts
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertTeacherClassAccess, getTeacherScope } from '../teacher/access';
import { assertParentClassAccess, getParentScope } from '../parent/access';
import { assertStudentClassAccess, getLoggedInStudent } from '../student/access';

export class ClassService {
  async createClass(data: {
    name: string;
    section: string;
    gradeLevel: string;
    academicYear: string;
    teacherId?: string;
    capacity?: number;
    room?: string;
  }) {
    const existing = await prisma.class.findFirst({
      where: {
        name: data.name,
        section: data.section,
        academicYear: data.academicYear,
        deletedAt: null,
      },
    });
    if (existing) throw AppError.conflict('Class already exists for this academic year');
    if (data.teacherId) {
      const teacher = await prisma.teacherProfile.findUnique({ where: { id: data.teacherId } });
      if (!teacher || teacher.deletedAt) throw AppError.notFound('Teacher not found');
    }

    return prisma.class.create({ data: { ...data, capacity: data.capacity || 40 } });
  }

  async getClasses(req: AuthenticatedRequest) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { academicYear, gradeLevel } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (req.user?.role === 'TEACHER') {
      const scope = await getTeacherScope(req.user.id);
      where.id = { in: scope.classIds };
    }
    if (req.user?.role === 'PARENT') {
      const scope = await getParentScope(req.user.id);
      where.id = { in: scope.classIds };
    }
    if (req.user?.role === 'STUDENT') {
      const student = await getLoggedInStudent(req.user.id);
      where.id = student.classId || '__none__';
    }
    if (academicYear) where.academicYear = academicYear as string;
    if (gradeLevel) where.gradeLevel = gradeLevel as string;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          _count: { select: { students: true, subjects: true } },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.class.count({ where }),
    ]);

    return { data: classes, meta: buildPaginationMeta(total, page, limit) };
  }

  async getClassById(id: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    let teacherScope: Awaited<ReturnType<typeof getTeacherScope>> | undefined;
    let parentScope: Awaited<ReturnType<typeof getParentScope>> | undefined;
    let studentScope: Awaited<ReturnType<typeof getLoggedInStudent>> | undefined;
    if (user?.role === 'TEACHER') {
      await assertTeacherClassAccess(user, id);
      teacherScope = await getTeacherScope(user.id);
    }
    if (user?.role === 'PARENT') {
      await assertParentClassAccess(user, id);
      parentScope = await getParentScope(user.id);
    }
    if (user?.role === 'STUDENT') {
      await assertStudentClassAccess(user, id);
      studentScope = await getLoggedInStudent(user.id);
    }
    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        students: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
        subjects: {
          include: {
            subject: true,
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    if (!cls || cls.deletedAt) throw AppError.notFound('Class not found');
    if (teacherScope && !teacherScope.classTeacherIds.includes(id)) {
      return {
        ...cls,
        subjects: cls.subjects.filter(
          (item) => item.teacherId === teacherScope.teacher.id && item.status === 'ACTIVE'
        ),
      };
    }
    if (parentScope) {
      return {
        ...cls,
        students: cls.students.filter((student) => parentScope.studentIds.includes(student.id)),
      };
    }
    if (studentScope) {
      return {
        ...cls,
        students: cls.students.filter((student) => student.id === studentScope.id),
      };
    }
    return cls;
  }

  async updateClass(id: string, data: Partial<{
    name: string;
    section: string;
    gradeLevel: string;
    teacherId: string;
    capacity: number;
    room: string;
  }>) {
    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls || cls.deletedAt) throw AppError.notFound('Class not found');
    if (data.teacherId) {
      const teacher = await prisma.teacherProfile.findUnique({ where: { id: data.teacherId } });
      if (!teacher || teacher.deletedAt) throw AppError.notFound('Teacher not found');
    }
    return prisma.class.update({ where: { id }, data });
  }

  async deleteClass(id: string) {
    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls || cls.deletedAt) throw AppError.notFound('Class not found');
    const [students, attendance, results, assignments, timetableSlots, fees] = await Promise.all([
      prisma.studentProfile.count({ where: { classId: id, deletedAt: null } }),
      prisma.attendance.count({ where: { classId: id } }),
      prisma.result.count({ where: { classId: id } }),
      prisma.assignment.count({ where: { classId: id, deletedAt: null } }),
      prisma.timetableSlot.count({ where: { classId: id } }),
      prisma.fee.count({ where: { classId: id } }),
    ]);
    if (students || attendance || results || assignments || timetableSlots || fees) {
      throw AppError.conflict('Class has linked academic or financial records and cannot be archived');
    }
    return prisma.class.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getClassAnalytics(classId: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    let teacherScope: Awaited<ReturnType<typeof getTeacherScope>> | undefined;
    if (user?.role === 'TEACHER') {
      await assertTeacherClassAccess(user, classId);
      teacherScope = await getTeacherScope(user.id);
    }
    const isClassTeacher = teacherScope?.classTeacherIds.includes(classId) ?? false;
    const assignedSubjectIds = teacherScope?.teacher.subjectTeachers
      .filter((item) => item.classId === classId)
      .map((item) => item.subjectId) ?? [];

    const [students, attendances, results, assignments] = await Promise.all([
      prisma.studentProfile.count({ where: { classId } }),
      prisma.attendance.findMany({ where: { classId }, select: { status: true } }),
      prisma.result.findMany({
        where: {
          classId,
          isPublished: true,
          ...(!isClassTeacher && teacherScope && { subjectId: { in: assignedSubjectIds } }),
        },
        select: { percentage: true, studentId: true },
      }),
      prisma.assignment.count({
        where: {
          classId,
          deletedAt: null,
          ...(teacherScope && { teacherId: teacherScope.teacher.id }),
        },
      }),
    ]);

    const presentCount = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;

    const attendanceRate = attendances.length > 0
      ? (presentCount / attendances.length) * 100
      : 0;

    const avgScore = results.length > 0
      ? results.reduce((s, r) => s + r.percentage, 0) / results.length
      : 0;

    // Top and bottom performers
    const studentScores: Record<string, number[]> = {};
    results.forEach((r) => {
      if (!studentScores[r.studentId]) studentScores[r.studentId] = [];
      studentScores[r.studentId].push(r.percentage);
    });

    const studentAvgs = Object.entries(studentScores).map(([id, scores]) => ({
      studentId: id,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    studentAvgs.sort((a, b) => b.avg - a.avg);

    return {
      totalStudents: students,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      averageScore: Math.round(avgScore * 100) / 100,
      totalAssignments: assignments,
      topPerformers: studentAvgs.slice(0, 5),
      bottomPerformers: studentAvgs.slice(-5).reverse(),
    };
  }
}

export class SubjectService {
  async createSubject(data: {
    name: string;
    code: string;
    description?: string;
    credits?: number;
  }) {
    const code = data.code.trim().toUpperCase();
    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing) throw AppError.conflict(`Subject code '${code}' already exists`);
    return prisma.subject.create({ data: { ...data, code } });
  }

  async getSubjects(user?: NonNullable<AuthenticatedRequest['user']>) {
    if (user?.role === 'TEACHER') {
      const scope = await getTeacherScope(user.id);
      return prisma.subject.findMany({
        where: { id: { in: scope.subjectIds }, deletedAt: null },
        orderBy: { name: 'asc' },
      });
    }
    if (user?.role === 'PARENT') {
      const scope = await getParentScope(user.id);
      return prisma.subject.findMany({
        where: {
          deletedAt: null,
          subjectTeachers: { some: { classId: { in: scope.classIds }, status: 'ACTIVE' } },
        },
        orderBy: { name: 'asc' },
      });
    }
    if (user?.role === 'STUDENT') {
      const student = await getLoggedInStudent(user.id);
      return prisma.subject.findMany({
        where: {
          deletedAt: null,
          subjectTeachers: {
            some: {
              classId: student.classId || '__none__',
              status: 'ACTIVE',
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }
    return prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async updateSubject(id: string, data: Partial<{
    name: string;
    description: string;
    credits: number;
  }>) {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.deletedAt) throw AppError.notFound('Subject not found');
    return prisma.subject.update({ where: { id }, data });
  }
}
