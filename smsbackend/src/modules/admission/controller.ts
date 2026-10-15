import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AdmissionService } from './service';

const service = new AdmissionService();

export const create = asyncHandler(async (req, res: Response) => {
  const application = await service.create(req.body);
  ApiResponse.created(res, { message: 'Admission application submitted', data: application });
});

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.list(req));
});

export const get = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.get(req.params.id) });
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const application = await service.updateStatus(req.params.id, req.body.status, req.body.reviewNotes, req.user!.id);
  ApiResponse.success(res, { message: 'Admission status updated', data: application });
});

export const enroll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const application = await service.convertToStudent(req.params.id, req.user!.id);
  ApiResponse.success(res, { message: 'Applicant converted to a pending student account', data: application });
});
