// controller.ts
import { Response } from 'express';
import { AnalyticsService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';

const service = new AnalyticsService();

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  let data: unknown;

  switch (role) {
    case 'ADMIN':
      data = await service.getAdminDashboard(req.user!);
      break;
    case 'TEACHER':
      data = await service.getTeacherDashboard(req.user!.id);
      break;
    case 'STUDENT':
      data = await service.getStudentDashboard(req.user!.id);
      break;
    case 'PARENT':
      data = await service.getParentDashboard(req.user!.id);
      break;
    default:
      throw AppError.forbidden('No analytics available for this role');
  }

  ApiResponse.success(res, { data });
});

export const getAdminAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.getAdminDashboard(req.user!);
  ApiResponse.success(res, { data });
});
