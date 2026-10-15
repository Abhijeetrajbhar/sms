import prisma from '../../config/database';
import { AttendanceStatus, AuditAction } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { getAttendanceSummary, buildMonthlyHeatmap } from '../../utils/attendance';
import { auditLog } from '../auditLog/service';
import { notificationQueue } from '../../config/queue';
import { cacheDelPattern } from '../../config/redis';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertTeacherClassAccess, assertTeacherSubjectAccess } from '../teacher/access';

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export class AttendanceService {
  async bulkMarkAttendance(params: {
    classId: string;
    subjectId?: string;
    date: string;
    entries: AttendanceEntry[];
    markedById: string; // teacherProfile.id
    actorId: string;
    actorUserId: string;
    user: NonNullable<AuthenticatedRequest['user']>;
    req: Request;
  }) {
    const { classId, subjectId, date, entries, markedById, actorUserId, user, req } = params;
    if (user.role === 'TEACHER') {
      if (subjectId) await assertTeacherSubjectAccess(user, classId, subjectId);
      else await assertTeacherClassAccess(user, classId);
    }
    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      throw AppError.badRequest('A valid attendance date is required');
    }
    if (!entries.length) throw AppError.badRequest('At least one attendance entry is required');
    if (new Set(entries.map((entry) => entry.studentId)).size !== entries.length) {
      throw AppError.badRequest('Duplicate students are not allowed in an attendance request');
    }
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (attendanceDate >= tomorrow) throw AppError.unprocessable('Attendance cannot be marked for a future date');

    const validStudents = await prisma.studentProfile.count({
      where: {
        id: { in: entries.map((entry) => entry.studentId) },
        classId,
        deletedAt: null,
      },
    });
    if (validStudents !== entries.length) {
      throw AppError.unprocessable('Every attendance student must be active and belong to the selected class or section');
    }

    // Check for existing records
    const existing = await prisma.attendance.findMany({
      where: {
        classId,
        subjectId: subjectId ?? null,
        date: attendanceDate,
        studentId: { in: entries.map((e) => e.studentId) },
      },
    });

    if (existing.length > 0) {
      throw AppError.conflict(
        `Attendance already marked for ${existing.length} student(s) on this date`
      );
    }

    const records = await prisma.$transaction(
      entries.map((entry) =>
        prisma.attendance.create({
          data: {
            studentId: entry.studentId,
            classId,
            subjectId: subjectId ?? null,
            markedById,
            date: attendanceDate,
            status: entry.status,
            remarks: entry.remarks,
          },
        })
      )
    );

    // Queue low-attendance warning checks
    await notificationQueue.add('checkAttendanceWarning', {
      classId,
      date,
      entries,
    });

    await cacheDelPattern('analytics:*');
    await auditLog({
      actorId: actorUserId,
      action: AuditAction.ATTENDANCE_MARKED,
      entity: 'Attendance',
      metadata: { classId, date, count: records.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return records;
  }

  async updateAttendance(
    id: string,
    data: { status: AttendanceStatus; remarks?: string },
    user: NonNullable<AuthenticatedRequest['user']>,
    req: Request
  ) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Attendance record not found');
    if (user.role === 'TEACHER') {
      if (existing.subjectId) await assertTeacherSubjectAccess(user, existing.classId, existing.subjectId);
      else await assertTeacherClassAccess(user, existing.classId);
    }

    const updated = await prisma.attendance.update({ where: { id }, data });
    await cacheDelPattern('analytics:*');
    await auditLog({
      actorId: user.id,
      action: AuditAction.ATTENDANCE_UPDATED,
      entity: 'Attendance',
      entityId: id,
      metadata: { classId: existing.classId, studentId: existing.studentId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return updated;
  }

  async getStudentAttendance(studentId: string, req: Request) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { month, year } = req.query;

    const where: Record<string, unknown> = { studentId };
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          class: { select: { name: true, section: true } },
          subject: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return { data: records, meta: buildPaginationMeta(total, page, limit) };
  }

  async getClassAttendance(classId: string, date: string, user: NonNullable<AuthenticatedRequest['user']>, subjectId?: string) {
    if (user.role === 'TEACHER') {
      if (subjectId) await assertTeacherSubjectAccess(user, classId, subjectId);
      else await assertTeacherClassAccess(user, classId);
    }
    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      throw AppError.badRequest('A valid attendance date is required');
    }
    attendanceDate.setUTCHours(0, 0, 0, 0);
    return prisma.attendance.findMany({
      where: { classId, date: attendanceDate, ...(subjectId ? { subjectId } : {}) },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getMonthlyHeatmap(studentId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, status: true },
    });

    return buildMonthlyHeatmap(records);
  }

  async getAttendanceSummary(studentId: string) {
    const records = await prisma.attendance.findMany({
      where: { studentId },
      select: { status: true },
    });
    return getAttendanceSummary(records);
  }
}
