// service.ts
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getAttendanceSummary } from '../../utils/attendance';
import { assertParentStudentAccess, getParentScope } from './access';
import { AnnouncementTarget } from '@prisma/client';

export class ParentService {
  async createProfile(data: {
    userId: string;
    occupation?: string;
    relation?: string;
    emergencyContact?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw AppError.notFound('User not found');
    if (user.role !== 'PARENT') throw AppError.badRequest('User is not a parent');

    const existing = await prisma.parentProfile.findUnique({ where: { userId: data.userId } });
    if (existing) throw AppError.conflict('Parent profile already exists');

    return prisma.parentProfile.create({
      data,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async getParentById(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    if (user.role === 'PARENT') {
      const own = await prisma.parentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!own || own.id !== id) throw AppError.forbidden('You can only access your own parent profile');
    } else if (user.role !== 'ADMIN') {
      throw AppError.forbidden('Parent profile access is restricted');
    }
    const parent = await prisma.parentProfile.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      },
    });
    if (!parent || parent.deletedAt) throw AppError.notFound('Parent not found');
    return parent;
  }

  async getLinkedChildren(parentUserId: string) {
    const scope = await getParentScope(parentUserId);

    return prisma.studentProfile.findMany({
      where: { id: { in: scope.studentIds }, deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, status: true } },
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            gradeLevel: true,
            academicYear: true,
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: { studentCode: 'asc' },
    });
  }

  async getChildProfile(parentUserId: string, studentId: string) {
    await assertParentStudentAccess(
      { id: parentUserId, role: 'PARENT', email: '', firstName: '', lastName: '', permissions: [], isSuperAdmin: false },
      studentId
    );
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, status: true } },
        class: {
          select: {
            id: true,
            name: true,
            section: true,
            gradeLevel: true,
            academicYear: true,
            room: true,
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    if (!student || student.deletedAt) throw AppError.notFound('Linked student not found');
    return student;
  }

  async getDashboard(parentUserId: string, selectedStudentId?: string) {
    const scope = await getParentScope(parentUserId);
    const children = await this.getLinkedChildren(parentUserId);
    const studentId = selectedStudentId || children[0]?.id;
    if (studentId) {
      await assertParentStudentAccess(
        { id: parentUserId, role: 'PARENT', email: '', firstName: '', lastName: '', permissions: [], isSuperAdmin: false },
        studentId
      );
    }

    const profile = {
      id: scope.parent.id,
      occupation: scope.parent.occupation,
      relation: scope.parent.relation,
      emergencyContact: scope.parent.emergencyContact,
      user: scope.parent.user,
    };
    if (!studentId) {
      return {
        profile,
        children: [],
        selectedChild: null,
        attendance: { summary: getAttendanceSummary([]), records: [] },
        fees: { legacy: [], invoices: [], payments: [], receipts: [] },
        assignments: [],
        results: [],
        timetable: [],
        notices: [],
        notifications: [],
      };
    }

    const selectedChild = children.find((child) => child.id === studentId);
    if (!selectedChild) throw AppError.forbidden('Selected student is not linked to this parent');
    const classId = selectedChild.classId;

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
        orderBy: { publishedAt: 'desc' },
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
                { target: AnnouncementTarget.PARENTS },
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
      prisma.notification.findMany({ where: { userId: parentUserId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    return {
      profile,
      children,
      selectedChild,
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

  async getParents(req: Request) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { search } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [parents, total] = await Promise.all([
      prisma.parentProfile.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } } },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.parentProfile.count({ where }),
    ]);

    return { data: parents, meta: buildPaginationMeta(total, page, limit) };
  }
}
