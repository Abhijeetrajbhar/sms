import { Response } from 'express';
import { ParentService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new ParentService();

export const createProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await service.createProfile(req.body);
  ApiResponse.created(res, { message: 'Parent profile created', data: profile });
});

export const onboardParent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.onboardParent(req.body, req.user!.id, req);
  ApiResponse.created(res, {
    message: result.credentialDelivery === 'TEMP_PASSWORD'
      ? 'Parent onboarded successfully with temporary credentials'
      : 'Parent onboarded and invitation dispatched',
    data: result,
  });
});

export const getParents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getParents(req);
  ApiResponse.success(res, result);
});

export const getParentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parent = await service.getParentById(req.params.id, req.user!);
  ApiResponse.success(res, { data: parent });
});

export const getMyChildren = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const children = await service.getLinkedChildren(req.user!.id);
  ApiResponse.success(res, { data: children });
});

export const getMyDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await service.getDashboard(req.user!.id, req.query.studentId ? String(req.query.studentId) : undefined);
  ApiResponse.success(res, { data: dashboard });
});

export const getChildProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await service.getChildProfile(req.user!.id, req.params.studentId);
  ApiResponse.success(res, { data: profile });
});
