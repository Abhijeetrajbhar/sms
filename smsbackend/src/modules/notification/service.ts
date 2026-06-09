import prisma from '../../config/database';
import { NotificationType, Prisma } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { emitToUser } from '../../config/socket';
import { Request } from 'express';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export class NotificationService {
  async createNotification(data: NotificationPayload) {
    const notification = await prisma.notification.create({ data });

    // Emit real-time event
    emitToUser(data.userId, 'notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      metadata: notification.metadata,
    });

    return notification;
  }

  async createBulkNotifications(notifications: NotificationPayload[]) {
    const created = await prisma.notification.createMany({ data: notifications });

    // Emit to each user
    notifications.forEach((n) => {
      emitToUser(n.userId, 'notification:new', {
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: new Date(),
      });
    });

    return created;
  }

  async getNotifications(userId: string, req: Request) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { isRead } = req.query;

    const where: Record<string, unknown> = { userId };
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { ...buildPaginationMeta(total, page, limit), unreadCount },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw AppError.notFound('Notification not found');
    if (notification.userId !== userId) throw AppError.forbidden('Not your notification');

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw AppError.notFound('Notification not found');
    if (notification.userId !== userId) throw AppError.forbidden('Not your notification');

    return prisma.notification.delete({ where: { id: notificationId } });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }
}
