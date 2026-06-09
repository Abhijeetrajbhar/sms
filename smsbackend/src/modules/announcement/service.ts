// service.ts
import prisma from '../../config/database';
import { AnnouncementTarget } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { notificationQueue } from '../../config/queue';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertClassTeacherAccess, getTeacherScope } from '../teacher/access';
import { getParentScope } from '../parent/access';
import { getLoggedInStudent } from '../student/access';

export class AnnouncementService {
  async createAnnouncement(data: {
    title: string;
    content: string;
    authorId: string;
    target: AnnouncementTarget;
    classId?: string;
    expiresAt?: string;
  }, user?: NonNullable<AuthenticatedRequest['user']>) {
    if (data.target === AnnouncementTarget.CLASS && !data.classId) {
      throw AppError.badRequest('classId is required for class-specific announcements');
    }
    if (user?.role === 'TEACHER') {
      if (data.target !== AnnouncementTarget.CLASS || !data.classId) {
        throw AppError.forbidden('Teachers can publish notices only to their class-teacher class');
      }
      await assertClassTeacherAccess(user, data.classId);
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        target: data.target,
        classId: data.classId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        class: { select: { name: true, section: true } },
      },
    });

    // Queue notification for target users
    await notificationQueue.add('announcement:new', {
      announcementId: announcement.id,
      title: announcement.title,
      target: data.target,
      classId: data.classId,
    });

    return announcement;
  }

  async getAnnouncements(userId: string, userRole: string, classId: string | undefined, req: Request) {
    const { page, limit, skip } = getPaginationOptions(req);

    // Build target filter based on role
    const targetFilter: AnnouncementTarget[] = [AnnouncementTarget.ALL];
    if (userRole === 'STUDENT') targetFilter.push(AnnouncementTarget.STUDENTS);
    if (userRole === 'TEACHER') targetFilter.push(AnnouncementTarget.TEACHERS);
    if (userRole === 'PARENT') targetFilter.push(AnnouncementTarget.PARENTS);
    if (userRole === 'ADMIN') {
      targetFilter.push(
        AnnouncementTarget.STUDENTS,
        AnnouncementTarget.TEACHERS,
        AnnouncementTarget.PARENTS,
        AnnouncementTarget.CLASS
      );
    }

    let allowedClassIds: string[] = classId ? [classId] : [];
    if (userRole === 'TEACHER') {
      const scope = await getTeacherScope(userId);
      if (classId && !scope.classIds.includes(classId)) throw AppError.forbidden('Not assigned to this class');
      allowedClassIds = classId ? [classId] : scope.classIds;
    }
    if (userRole === 'PARENT') {
      const scope = await getParentScope(userId);
      if (classId && !scope.classIds.includes(classId)) throw AppError.forbidden('Class is not linked to your children');
      allowedClassIds = classId ? [classId] : scope.classIds;
    }
    if (userRole === 'STUDENT') {
      const student = await getLoggedInStudent(userId);
      if (classId && classId !== student.classId) throw AppError.forbidden('Notice is not available to your class');
      allowedClassIds = student.classId ? [student.classId] : [];
    }

    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      AND: [
        {
          OR: [
            { target: { in: targetFilter.filter((t) => t !== AnnouncementTarget.CLASS) } },
            ...(allowedClassIds.length ? [{ target: AnnouncementTarget.CLASS, classId: { in: allowedClassIds } }] : []),
          ],
        },
      ],
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
          class: { select: { name: true, section: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    // Mark which ones user has read
    const withReadStatus = announcements.map((a) => ({
      ...a,
      isRead: a.readByIds.includes(userId),
    }));

    return { data: withReadStatus, meta: buildPaginationMeta(total, page, limit) };
  }

  async markRead(announcementId: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw AppError.notFound('Announcement not found');
    if (user.role === 'PARENT') {
      const scope = await getParentScope(user.id);
      const allowed = announcement.isActive
        && (!announcement.expiresAt || announcement.expiresAt > new Date())
        && (
          announcement.target === AnnouncementTarget.ALL
          || announcement.target === AnnouncementTarget.PARENTS
          || (announcement.target === AnnouncementTarget.CLASS && Boolean(announcement.classId) && scope.classIds.includes(announcement.classId!))
        );
      if (!allowed) throw AppError.forbidden('This notice is not available to your linked children');
    }
    if (user.role === 'STUDENT') {
      const student = await getLoggedInStudent(user.id);
      const allowed = announcement.isActive
        && (!announcement.expiresAt || announcement.expiresAt > new Date())
        && (
          announcement.target === AnnouncementTarget.ALL
          || announcement.target === AnnouncementTarget.STUDENTS
          || (announcement.target === AnnouncementTarget.CLASS && announcement.classId === student.classId)
        );
      if (!allowed) throw AppError.forbidden('This notice is not available to your class');
    }
    if (announcement.readByIds.includes(user.id)) return announcement;

    return prisma.announcement.update({
      where: { id: announcementId },
      data: { readByIds: { push: user.id } },
    });
  }

  async deactivate(id: string) {
    return prisma.announcement.update({ where: { id }, data: { isActive: false } });
  }
}
