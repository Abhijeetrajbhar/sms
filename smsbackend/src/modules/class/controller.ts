import { Response } from 'express';
import { ClassService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const classService = new ClassService();

export const createClass = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cls = await classService.createClass(req.body);
  ApiResponse.created(res, { message: 'Class created', data: cls });
});

export const getClasses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await classService.getClasses(req);
  ApiResponse.success(res, result);
});

export const getClassById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cls = await classService.getClassById(req.params.id, req.user!);
  ApiResponse.success(res, { data: cls });
});

export const updateClass = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await classService.updateClass(req.params.id, req.body);
  ApiResponse.success(res, { message: 'Class updated', data: updated });
});

export const deleteClass = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await classService.deleteClass(req.params.id);
  ApiResponse.success(res, { message: 'Class deleted' });
});

export const getClassAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const analytics = await classService.getClassAnalytics(req.params.id, req.user!);
  ApiResponse.success(res, { data: analytics });
});
