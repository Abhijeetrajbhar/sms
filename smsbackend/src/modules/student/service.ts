// ─── Student Service ─────────────────────────────────────────────────────────
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { getAttendanceSummary } from '../../utils/attendance';
import { calculateRiskScore } from '../../utils/riskScore';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getTeacherScope } from '../teacher/access';
import { AnnouncementTarget, AuditAction } from '@prisma/client';
import { getLoggedInStudent } from './access';
import { auditLog } from '../auditLog/service';

export class StudentService {
  async getMyProfile(studentUserId: string) {
    const student = await getLoggedInStudent(studentUserId);
    return {
      id: student.id,
      userId: student.userId,
      studentCode: student.studentCode,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      address: student.address,
      bloodGroup: student.bloodGroup,
      admissionDate: student.admissionDate,
      user: student.user,
      class: student.class,
    };
  }

  async getDashboard(studentUserId: string) {
    const profile = await this.getMyProfile(studentUserId);
    const studentId = profile.id;
    const classId = profile.class?.id;

    const [
      attendanceRows,
      legacyFees,
      invoices,
      payments,
      receipts,
      assignments,
      results,
      timetable,
      notices,
      notifications,
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentId },
        select: {
          id: true,
          date: true,
          status: true,
          remarks: true,
          class: { select: { name: true, section: true } },
          subject: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      prisma.fee.findMany({
        where: { studentId },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
          class: { select: { name: true, section: true } },
          payments: { orderBy: { paidAt: 'desc' }, take: 5 },
        },
        orderBy: { dueDate: 'desc' },
      }),
      prisma.feeInvoice.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.paymentAttempt.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.receipt.findMany({ where: { studentId }, orderBy: { issuedAt: 'desc' }, take: 50 }),
      classId
        ? prisma.assignment.findMany({
          where: { classId, isPublished: true, deletedAt: null },
          include: {
            class: { select: { name: true, section: true } },
            subject: { select: { name: true, code: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            submissions: { where: { studentId } },
          },
          orderBy: { dueDate: 'asc' },
          take: 100,
        })
        : Promise.resolve([]),
      prisma.result.findMany({
        where: { studentId, isPublished: true },
        include: {
          subject: { select: { name: true, code: true } },
          class: { select: { name: true, section: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      classId
        ? prisma.timetableSlot.findMany({
          where: { classId, timetable: { isActive: true } },
          include: {
            subject: { select: { name: true, code: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            timetable: { select: { academicYear: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        })
        : Promise.resolve([]),
      prisma.announcement.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            {
              OR: [
                { target: AnnouncementTarget.ALL },
                { target: AnnouncementTarget.STUDENTS },
                ...(classId ? [{ target: AnnouncementTarget.CLASS, classId }] : []),
              ],
            },
          ],
        },
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
          class: { select: { name: true, section: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.findMany({ where: { userId: studentUserId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    return {
      profile,
      attendance: {
        summary: getAttendanceSummary(attendanceRows),
        records: attendanceRows,
      },
      fees: { legacy: legacyFees, invoices, payments, receipts },
      assignments,
      results,
      timetable,
      notices,
      notifications,
    };
  }

  async createProfile(data: {
    userId: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: string;
    bloodGroup?: string;
    admissionDate?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw AppError.notFound('User not found');
    if (user.role !== 'STUDENT') throw AppError.badRequest('User is not a student');

    const existing = await prisma.studentProfile.findUnique({ where: { userId: data.userId } });
    if (existing) throw AppError.conflict('Student profile already exists');

    // Generate unique student code
    const count = await prisma.studentProfile.count();
    const studentCode = `STU${String(count + 1).padStart(5, '0')}`;

    return prisma.studentProfile.create({
      data: {
        userId: data.userId,
        studentCode,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender as never,
        address: data.address,
        bloodGroup: data.bloodGroup,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async assignToClass(studentId: string, classId: string, actorId?: string, req?: Request) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) throw AppError.notFound('Student not found');

    const classObj = await prisma.class.findUnique({ where: { id: classId } });
    if (!classObj) throw AppError.notFound('Class not found');

    // Check capacity
    const enrolled = await prisma.studentProfile.count({ where: { classId } });
    if (enrolled >= classObj.capacity) throw AppError.badRequest('Class is at full capacity');

    const updated = await prisma.studentProfile.update({
      where: { id: studentId },
      data: { classId },
    });
    if (actorId) {
      await auditLog({
        actorId,
        action: AuditAction.USER_UPDATED,
        entity: 'StudentClassAssignment',
        entityId: studentId,
        metadata: { classId },
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      });
    }
    return updated;
  }

  async linkParent(studentId: string, parentId: string, actorId?: string, req?: Request) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) throw AppError.notFound('Student not found');

    const parent = await prisma.parentProfile.findUnique({ where: { id: parentId } });
    if (!parent) throw AppError.notFound('Parent not found');

    if (student.parentIds.includes(parentId)) {
      throw AppError.conflict('Parent already linked to this student');
    }

    const updated = await prisma.studentProfile.update({
      where: { id: studentId },
      data: { parentIds: { push: parentId } },
    });
    if (actorId) {
      await auditLog({
        actorId,
        action: AuditAction.USER_UPDATED,
        entity: 'ParentStudentLink',
        entityId: studentId,
        metadata: { parentId },
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      });
    }
    return updated;
  }

  async getStudentProfile(studentId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        class: { select: { id: true, name: true, section: true, gradeLevel: true } },
      },
    });
    if (!student || student.deletedAt) throw AppError.notFound('Student not found');
    return student;
  }

  async getStudents(req: AuthenticatedRequest) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { classId, search } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (req.user?.role === 'TEACHER') {
      const scope = await getTeacherScope(req.user.id);
      where.classId = { in: scope.classIds };
    }
    if (classId) where.classId = classId as string;
    if (req.user?.role === 'TEACHER' && classId) {
      const scope = await getTeacherScope(req.user.id);
      if (!scope.classIds.includes(String(classId))) throw AppError.forbidden('Not assigned to this class or section');
    }
    if (search) {
      where.OR = [
        { studentCode: { contains: search as string, mode: 'insensitive' } },
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.studentProfile.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: req.user?.role === 'ADMIN', avatarUrl: true } },
          class: { select: { name: true, section: true } },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.studentProfile.count({ where }),
    ]);

    return { data: students, meta: buildPaginationMeta(total, page, limit) };
  }

  async getAttendanceSummary(studentId: string) {
    const records = await prisma.attendance.findMany({
      where: { studentId },
      select: { status: true, date: true },
    });
    return getAttendanceSummary(records);
  }

  async getRiskProfile(studentId: string) {
    const [attendances, results, submissions] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
      prisma.result.findMany({ where: { studentId, isPublished: true }, select: { percentage: true } }),
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        select: { status: true, isLate: true },
      }),
    ]);

    const attendanceSummary = getAttendanceSummary(attendances);
    const avgMarks = results.length
      ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
      : 0;

    const missing = submissions.filter((s) =>
      s.status === 'MISSING' || s.status === 'PENDING'
    ).length;
    const late = submissions.filter((s) => s.isLate).length;

    const riskResult = calculateRiskScore({
      attendancePercentage: attendanceSummary.percentage,
      averageMarks: avgMarks,
      missingAssignments: missing,
      lateSubmissions: late,
      totalAssignments: submissions.length,
    });

    // Update stored risk score
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
      },
    });

    return riskResult;
  }
}
