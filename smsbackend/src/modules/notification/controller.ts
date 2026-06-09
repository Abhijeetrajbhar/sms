// controller.ts
import { Response } from 'express';
import { NotificationService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new NotificationService();

export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getNotifications(req.user!.id, req);
  ApiResponse.success(res, result);
});

export const markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.markAsRead(req.params.id, req.user!.id);
  ApiResponse.success(res, { message: 'Notification marked as read' });
});

export const markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.markAllAsRead(req.user!.id);
  ApiResponse.success(res, { message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.deleteNotification(req.params.id, req.user!.id);
  ApiResponse.success(res, { message: 'Notification deleted' });
});

export const getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await service.getUnreadCount(req.user!.id);
  ApiResponse.success(res, { data: { unreadCount: count } });
});
