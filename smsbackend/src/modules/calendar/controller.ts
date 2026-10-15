import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { CalendarService } from './service';

const service = new CalendarService();
export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, await service.list(req)));
export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.created(res, { message: 'Calendar event created', data: await service.create(req.body, req.user!.id) }));
export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, { message: 'Calendar event updated', data: await service.update(req.params.id, req.body, req.user!.id) }));
export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => { await service.remove(req.params.id); ApiResponse.success(res, { message: 'Calendar event deleted' }); });
