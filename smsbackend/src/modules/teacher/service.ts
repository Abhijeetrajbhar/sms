// service.ts
import prisma from '../../config/database';
import crypto from 'crypto';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getAttendanceSummary } from '../../utils/attendance';
import { getTeacherScope } from './access';
import { AuditAction, Role, UserStatus } from '@prisma/client';
import { auditLog } from '../auditLog/service';
import { hashPassword, generateRandomToken, hashToken } from '../../utils/password';
import { sendAccountInvitationEmail, buildAccountActivationUrl } from '../../utils/email';

export class TeacherService {
  async createProfile(data: {
    userId: string;
    qualification?: string;
    specialization?: string;
    experience?: number;
    dateOfJoining?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    if (user.role !== 'TEACHER') throw AppError.badRequest('User is not a teacher');
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw AppError.unprocessable('Teacher profile requires an active or pending teacher account');
    }

    const existing = await prisma.teacherProfile.findUnique({ where: { userId: data.userId } });
    if (existing) throw AppError.conflict('Teacher profile already exists');

    const employeeCode = `EMP${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return prisma.teacherProfile.create({
      data: {
        userId: data.userId,
        employeeCode,
        qualification: data.qualification,
        specialization: data.specialization,
        experience: data.experience,
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async onboardTeacher(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    qualification?: string;
    specialization?: string;
    experience?: number;
    dateOfJoining?: string;
    credentialDelivery?: 'EMAIL_INVITE' | 'TEMP_PASSWORD';
    temporaryPassword?: string;
  }, actorId: string, req?: Request) {
    if (!data.firstName?.trim() || !data.lastName?.trim() || !data.email?.trim()) {
      throw AppError.badRequest('First name, last name, and email are required');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('Email already registered');

    const isTempPassword = data.credentialDelivery === 'TEMP_PASSWORD';
    let rawPassword = '';
    let invitationToken: string | null = null;
    let invitationExpires: Date | null = null;

    if (isTempPassword) {
      rawPassword = data.temporaryPassword?.trim() || `Faculty#${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      rawPassword = generateRandomToken();
      invitationToken = generateRandomToken();
      invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    const hashedPassword = await hashPassword(rawPassword);
    const employeeCode = `EMP${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const { user, profile } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || undefined,
          role: Role.TEACHER,
          status: isTempPassword ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
          isEmailVerified: isTempPassword,
          emailVerifyToken: invitationToken ? hashToken(invitationToken) : null,
          emailVerifyExpires: invitationExpires,
          passwordResetToken: isTempPassword ? 'MUST_CHANGE_PASSWORD' : null,
        },
      });

      const newProfile = await tx.teacherProfile.create({
        data: {
          userId: newUser.id,
          employeeCode,
          qualification: data.qualification?.trim() || undefined,
          specialization: data.specialization?.trim() || undefined,
          experience: data.experience !== undefined && data.experience !== null ? Number(data.experience) : undefined,
          dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
        },
      });

      return { user: newUser, profile: newProfile };
    });

    await auditLog({
      actorId,
      action: AuditAction.USER_CREATED,
      entity: 'TeacherOnboarding',
      entityId: profile.id,
      metadata: { email, employeeCode, credentialDelivery: data.credentialDelivery || 'EMAIL_INVITE' },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    let invitationDelivered = false;
    if (invitationToken) {
      invitationDelivered = await sendAccountInvitationEmail(user.email, invitationToken, user.firstName);
    }

    return {
      teacher: {
        id: profile.id,
        userId: user.id,
        employeeCode,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        qualification: profile.qualification,
        specialization: profile.specialization,
      },
      credentialDelivery: isTempPassword ? 'TEMP_PASSWORD' : 'EMAIL_INVITE',
      invitationDelivered,
      activationUrl: invitationToken ? buildAccountActivationUrl(invitationToken) : null,
      temporaryPassword: isTempPassword ? rawPassword : null,
    };
  }

  async getTeachers(req: AuthenticatedRequest) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { search } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (req.user?.role === 'TEACHER') where.userId = req.user.id;
    if (search) {
      where.OR = [
        { employeeCode: { contains: search as string, mode: 'insensitive' } },
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          classes: { select: { id: true, name: true, section: true } },
          subjectTeachers: {
            include: {
              subject: { select: { name: true, code: true } },
              class: { select: { name: true, section: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    return { data: teachers, meta: buildPaginationMeta(total, page, limit) };
  }

  async getTeacherById(id: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    if (user?.role === 'STUDENT') {
      throw AppError.forbidden('Teacher profile access is restricted');
    }
    if (user?.role === 'TEACHER') {
      const own = await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!own || own.id !== id) throw AppError.forbidden('You can only access your own teacher profile');
    }
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        classes: { select: { id: true, name: true, section: true, gradeLevel: true } },
        subjectTeachers: {
          include: {
            subject: true,
            class: { select: { name: true, section: true } },
          },
        },
      },
    });
    if (!teacher || teacher.deletedAt) throw AppError.notFound('Teacher not found');
    return teacher;
  }

  async assignSubject(teacherId: string, classId: string, subjectId: string, assignedBy?: string) {
    const [teacher, classObj, subject] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { id: teacherId } }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!teacher || teacher.deletedAt) throw AppError.notFound('Teacher not found');
    if (!classObj || classObj.deletedAt) throw AppError.notFound('Class not found');
    if (!subject || subject.deletedAt) throw AppError.notFound('Subject not found');

    const existing = await prisma.subjectTeacher.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    if (existing) {
      return prisma.subjectTeacher.update({
        where: { id: existing.id },
        data: { teacherId, status: 'ACTIVE', assignedBy },
      });
    }

    return prisma.subjectTeacher.create({
      data: { classId, subjectId, teacherId, assignedBy },
    });
  }

  async getAssignedClasses(teacherId: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    if (user?.role === 'STUDENT') {
      throw AppError.forbidden('Teacher class assignments are restricted');
    }
    let scope: Awaited<ReturnType<typeof getTeacherScope>> | undefined;
    if (user?.role === 'TEACHER') {
      const own = await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!own || own.id !== teacherId) throw AppError.forbidden('You can only access your own assigned classes');
      scope = await getTeacherScope(user.id);
    }
    const classes = await prisma.class.findMany({
      where: {
        deletedAt: null,
        OR: [
          { teacherId },
          { subjects: { some: { teacherId, status: 'ACTIVE' } } },
        ],
      },
      include: {
        students: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subjects: {
          include: { subject: true },
        },
      },
    });
    if (!scope) return classes;
    return classes.map((item) => scope.classTeacherIds.includes(item.id) ? item : {
      ...item,
      subjects: item.subjects.filter(
        (subject) => subject.teacherId === teacherId && subject.status === 'ACTIVE'
      ),
    });
  }

  async getClassAnalytics(teacherId: string, classId: string, user?: NonNullable<AuthenticatedRequest['user']>) {
    if (user?.role === 'TEACHER') {
      const own = await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!own || own.id !== teacherId) throw AppError.forbidden('You can only access your own class analytics');
    }
    const classObj = await prisma.class.findFirst({
      where: {
        id: classId,
        OR: [{ teacherId }, { subjects: { some: { teacherId, status: 'ACTIVE' } } }],
      },
      include: {
        subjects: {
          where: { teacherId, status: 'ACTIVE' },
          select: { subjectId: true },
        },
      },
    });
    if (!classObj) throw AppError.forbidden('Not assigned to this class');
    const isClassTeacher = classObj.teacherId === teacherId;
    const assignedSubjectIds = classObj.subjects.map((item) => item.subjectId);

    const [students, attendances, results, assignments] = await Promise.all([
      prisma.studentProfile.count({ where: { classId } }),
      prisma.attendance.findMany({
        where: { classId },
        select: { status: true },
      }),
      prisma.result.findMany({
        where: {
          classId,
          isPublished: true,
          ...(!isClassTeacher && { subjectId: { in: assignedSubjectIds } }),
        },
        select: { percentage: true, subjectId: true },
      }),
      prisma.assignment.count({ where: { classId, teacherId } }),
    ]);

    const presentCount = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;

    const attendanceRate =
      attendances.length > 0 ? (presentCount / attendances.length) * 100 : 0;

    const avgScore =
      results.length > 0
        ? results.reduce((s, r) => s + r.percentage, 0) / results.length
        : 0;

    return {
      totalStudents: students,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      averageScore: Math.round(avgScore * 100) / 100,
      totalAssignments: assignments,
      totalAttendanceRecords: attendances.length,
    };
  }

  async getMyDashboard(userId: string) {
    const scope = await getTeacherScope(userId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dayOfWeek = (new Date().getDay() + 6) % 7;

    const [students, attendanceRows, todayAttendanceClasses, recentAssignments, submissions, timetable, notices, marks] =
      await Promise.all([
        prisma.studentProfile.findMany({
          where: { classId: { in: scope.classIds }, deletedAt: null },
          select: {
            id: true,
            studentCode: true,
            riskLevel: true,
            classId: true,
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, section: true, academicYear: true } },
          },
        }),
        prisma.attendance.findMany({
          where: { classId: { in: scope.classIds }, date: { gte: today, lt: tomorrow } },
          select: { status: true, classId: true },
        }),
        prisma.attendance.findMany({
          where: { classId: { in: scope.classIds }, date: { gte: today, lt: tomorrow } },
          distinct: ['classId'],
          select: { classId: true },
        }),
        prisma.assignment.findMany({
          where: { teacherId: scope.teacher.id, deletedAt: null },
          include: {
            class: { select: { name: true, section: true, academicYear: true } },
            subject: { select: { name: true, code: true } },
            _count: { select: { submissions: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.assignmentSubmission.findMany({
          where: { assignment: { teacherId: scope.teacher.id, deletedAt: null }, status: { in: ['SUBMITTED', 'LATE'] } },
          select: { id: true, status: true, isLate: true, assignmentId: true },
        }),
        prisma.timetableSlot.findMany({
          where: { teacherId: scope.teacher.id, timetable: { isActive: true } },
          include: {
            class: { select: { id: true, name: true, section: true, academicYear: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        prisma.announcement.findMany({
          where: {
            isActive: true,
            OR: [
              { target: 'ALL' },
              { target: 'TEACHERS' },
              { target: 'CLASS', classId: { in: scope.classIds } },
            ],
            AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
          },
          include: {
            author: { select: { firstName: true, lastName: true, role: true } },
            class: { select: { name: true, section: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.result.groupBy({
          by: ['classId', 'subjectId', 'examType', 'term', 'academicYear', 'status'],
          where: {
            OR: scope.teacher.subjectTeachers.map((item) => ({ classId: item.classId, subjectId: item.subjectId })),
          },
          _count: { _all: true },
        }),
      ]);

    const attendance = getAttendanceSummary(attendanceRows);
    const markedClassIds = new Set(todayAttendanceClasses.map((item) => item.classId));
    const todayTimetable = timetable.filter((item) => item.dayOfWeek === dayOfWeek);

    return {
      profile: {
        id: scope.teacher.id,
        employeeCode: scope.teacher.employeeCode,
        qualification: scope.teacher.qualification,
        specialization: scope.teacher.specialization,
        experience: scope.teacher.experience,
        dateOfJoining: scope.teacher.dateOfJoining,
        user: scope.teacher.user,
      },
      assignedClasses: scope.classIds.map((classId) => {
        const classTeacherClass = scope.teacher.classes.find((item) => item.id === classId);
        const subjectClass = scope.teacher.subjectTeachers.find((item) => item.classId === classId)?.class;
        return { ...(classTeacherClass || subjectClass), isClassTeacher: scope.classTeacherIds.includes(classId) };
      }),
      assignedSubjects: scope.teacher.subjectTeachers.map((item) => ({
        id: item.id,
        subject: item.subject,
        class: item.class,
        status: item.status,
      })),
      students,
      studentCount: students.length,
      attendance,
      todayTimetable,
      upcomingClasses: todayTimetable.filter((item) => item.endTime >= new Date().toTimeString().slice(0, 5)),
      pendingAttendance: scope.classIds.filter((id) => !markedClassIds.has(id)),
      pendingSubmissions: submissions,
      recentAssignments,
      marksTasks: marks,
      notices,
    };
  }

  async getMyClasses(userId: string) {
    const scope = await getTeacherScope(userId);
    const classes = await this.getAssignedClasses(scope.teacher.id);
    return classes.map((item) => scope.classTeacherIds.includes(item.id) ? item : {
      ...item,
      subjects: item.subjects.filter(
        (subject) => subject.teacherId === scope.teacher.id && subject.status === 'ACTIVE'
      ),
    });
  }

  async getMySubjects(userId: string) {
    const scope = await getTeacherScope(userId);
    return scope.teacher.subjectTeachers.map((item) => ({
      id: item.id,
      status: item.status,
      class: item.class,
      subject: item.subject,
      isClassTeacher: scope.classTeacherIds.includes(item.classId),
    }));
  }

  async getMyStudents(userId: string, req: Request) {
    const scope = await getTeacherScope(userId);
    const { page, limit, skip } = getPaginationOptions(req);
    const classId = req.query.classId ? String(req.query.classId) : undefined;
    if (classId && !scope.classIds.includes(classId)) throw AppError.forbidden('Not assigned to this class');
    const where = { classId: classId || { in: scope.classIds }, deletedAt: null };
    const [data, total] = await Promise.all([
      prisma.studentProfile.findMany({
        where,
        select: {
          id: true,
          studentCode: true,
          riskLevel: true,
          riskScore: true,
          classId: true,
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          class: { select: { name: true, section: true, academicYear: true } },
        },
        orderBy: { studentCode: 'asc' },
        skip,
        take: limit,
      }),
      prisma.studentProfile.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}
