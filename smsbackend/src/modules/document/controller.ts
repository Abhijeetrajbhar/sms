import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { DocumentService } from './service';

const service = new DocumentService();
export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, { data: await service.list(req.params.studentId) }));
export const upload = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.created(res, { message: 'Student document uploaded', data: await service.upload(req.params.studentId, req.body, req.file, req.user!.id) }));
export const review = asyncHandler(async (req: AuthenticatedRequest, res: Response) => ApiResponse.success(res, { message: 'Student document reviewed', data: await service.review(req.params.id, req.body.status, req.body.reviewNotes, req.user!.id) }));
export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => { await service.remove(req.params.id); ApiResponse.success(res, { message: 'Student document deleted' }); });
