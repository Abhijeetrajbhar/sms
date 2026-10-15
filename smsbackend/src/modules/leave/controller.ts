import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { LeaveService } from './service';

const service = new LeaveService();
export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.created(res, { message: 'Leave request submitted', data: await service.create(req.body, req.user!.id) }));
export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, await service.list(req, req.user!)));
export const review = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, { message: 'Leave request reviewed', data: await service.review(req.params.id, req.body.status, req.body.reviewNotes, req.user!.id) }));
export const cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, { message: 'Leave request cancelled', data: await service.cancel(req.params.id, req.user!.id) }));
