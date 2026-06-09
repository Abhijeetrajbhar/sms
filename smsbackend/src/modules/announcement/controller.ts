// controller.ts
import { Response } from 'express';
import { AnnouncementService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new AnnouncementService();

export const createAnnouncement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const announcement = await service.createAnnouncement({
    ...req.body,
    authorId: req.user!.id,
  }, req.user!);
  ApiResponse.created(res, { message: 'Announcement created', data: announcement });
});

export const getAnnouncements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const classId = req.query.classId as string | undefined;
  const result = await service.getAnnouncements(req.user!.id, req.user!.role, classId, req);
  ApiResponse.success(res, result);
});

export const markRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.markRead(req.params.id, req.user!);
  ApiResponse.success(res, { message: 'Announcement marked as read' });
});

export const deactivate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.deactivate(req.params.id);
  ApiResponse.success(res, { message: 'Announcement deactivated' });
});
