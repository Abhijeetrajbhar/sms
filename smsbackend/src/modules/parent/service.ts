import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getAttendanceSummary } from '../../utils/attendance';
import { assertParentStudentAccess, getParentScope } from './access';
import { AnnouncementTarget, AuditAction, Role, UserStatus } from '@prisma/client';
import { auditLog } from '../auditLog/service';
import { hashPassword, generateRandomToken, hashToken } from '../../utils/password';
import { sendAccountInvitationEmail, buildAccountActivationUrl } from '../../utils/email';

export class ParentService {
  async createProfile(data: {
    userId: string;
    occupation?: string;
    relation?: string;
    emergencyContact?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    if (user.role !== 'PARENT') throw AppError.badRequest('User is not a parent');
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw AppError.unprocessable('Parent profile requires an active or pending parent account');
    }

    const existing = await prisma.parentProfile.findUnique({ where: { userId: data.userId } });
    if (existing) throw AppError.conflict('Parent profile already exists');

    return prisma.parentProfile.create({
      data,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async onboardParent(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    relation?: string;
    occupation?: string;
    emergencyContact?: string;
    studentId?: string;
    credentialDelivery?: 'EMAIL_INVITE' | 'TEMP_PASSWORD';
    temporaryPassword?: string;
  }, actorId: string, req?: Request) {
    if (!data.firstName?.trim() || !data.lastName?.trim() || !data.email?.trim()) {
      throw AppError.badRequest('First name, last name, and email are required');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('Email already registered');

    if (data.studentId) {
      const student = await prisma.studentProfile.findUnique({ where: { id: data.studentId } });
      if (!student || student.deletedAt) throw AppError.notFound('Selected student not found');
    }

    const isTempPassword = data.credentialDelivery === 'TEMP_PASSWORD';
    let rawPassword = '';
    let invitationToken: string | null = null;
    let invitationExpires: Date | null = null;

    if (isTempPassword) {
      rawPassword = data.temporaryPassword?.trim() || `Parent#${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      rawPassword = generateRandomToken();
      invitationToken = generateRandomToken();
      invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    const hashedPassword = await hashPassword(rawPassword);

    const { user, profile } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || undefined,
          role: Role.PARENT,
          status: isTempPassword ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
          isEmailVerified: isTempPassword,
          emailVerifyToken: invitationToken ? hashToken(invitationToken) : null,
          emailVerifyExpires: invitationExpires,
          passwordResetToken: isTempPassword ? 'MUST_CHANGE_PASSWORD' : null,
        },
      });

      const newProfile = await tx.parentProfile.create({
        data: {
          userId: newUser.id,
          relation: data.relation?.trim() || undefined,
          occupation: data.occupation?.trim() || undefined,
          emergencyContact: data.emergencyContact?.trim() || undefined,
        },
      });

      if (data.studentId) {
        await tx.studentProfile.update({
          where: { id: data.studentId },
          data: { parentIds: { push: newProfile.id } },
        });
      }

      return { user: newUser, profile: newProfile };
    });

    await auditLog({
      actorId,
      action: AuditAction.USER_CREATED,
      entity: 'ParentOnboarding',
      entityId: profile.id,
      metadata: { email, credentialDelivery: data.credentialDelivery || 'EMAIL_INVITE', studentId: data.studentId },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    let invitationDelivered = false;
    if (invitationToken) {
      invitationDelivered = await sendAccountInvitationEmail(user.email, invitationToken, user.firstName);
    }

    return {
      parent: {
        id: profile.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        relation: profile.relation,
      },
      credentialDelivery: isTempPassword ? 'TEMP_PASSWORD' : 'EMAIL_INVITE',
      invitationDelivered,
      activationUrl: invitationToken ? buildAccountActivationUrl(invitationToken) : null,
      temporaryPassword: isTempPassword ? rawPassword : null,
    };
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
        include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true, status: true } } },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.parentProfile.count({ where }),
    ]);

    return { data: parents, meta: buildPaginationMeta(total, page, limit) };
  }
}
