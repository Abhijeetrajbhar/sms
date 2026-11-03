import { Response } from 'express';
import { ResultService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new ResultService();

export const createResult = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.createResult(req.body, req.user!, req);
  ApiResponse.created(res, { message: 'Result created', data: result });
});

export const bulkCreate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const results = await service.bulkCreateResults(req.body, req.user!, req);
  ApiResponse.created(res, { message: `${results.length} results created`, data: results });
});

export const updateResult = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.updateResult(req.params.id, req.body, req.user!, req);
  ApiResponse.success(res, { message: 'Result updated', data: updated });
});

export const publishResults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.publishResults(req.body, req.user!.id, req);
  ApiResponse.success(res, { message: `${result.published} results published`, data: result });
});

export const getStudentResults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getStudentResults(req.params.studentId, req);
  ApiResponse.success(res, result);
});

export const getClassResults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const results = await service.getClassResults(req.params.classId, req);
  ApiResponse.success(res, { data: results });
});

export const getMarksStudents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getMarksStudents(req.query as never, req.user!) });
});

export const saveDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.saveDraft(req.body, req.user!, req);
  ApiResponse.success(res, { message: `${data.length} draft marks saved`, data });
});

export const submitFinal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.submitFinal(req.body, req.user!, req);
  ApiResponse.success(res, { message: `${data.count} marks submitted for review`, data });
});

export const getMarksHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.getMarksHistory(req.user!, req));
});

export const unlockResult = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { message: 'Marks unlocked for editing', data: await service.unlock(req.params.id, req.user!.id, req) });
});
