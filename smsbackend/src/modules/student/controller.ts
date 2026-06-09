// controller.ts
import { Response } from 'express';
import { StudentService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new StudentService();

export const createProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await service.createProfile(req.body);
  ApiResponse.created(res, { message: 'Student profile created', data: profile });
});

export const getStudents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getStudents(req);
  ApiResponse.success(res, result);
});

export const getStudentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const student = await service.getStudentProfile(req.params.id);
  ApiResponse.success(res, { data: student });
});

export const getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const student = await service.getMyProfile(req.user!.id);
  ApiResponse.success(res, { data: student });
});

export const getMyDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await service.getDashboard(req.user!.id);
  ApiResponse.success(res, { data: dashboard });
});

export const assignToClass = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.assignToClass(req.params.id, req.body.classId, req.user!.id, req);
  ApiResponse.success(res, { message: 'Student assigned to class', data: updated });
});

export const linkParent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.linkParent(req.params.id, req.body.parentId, req.user!.id, req);
  ApiResponse.success(res, { message: 'Parent linked', data: updated });
});

export const getAttendanceSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await service.getAttendanceSummary(req.params.id);
  ApiResponse.success(res, { data: summary });
});

export const getRiskProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const risk = await service.getRiskProfile(req.params.id);
  ApiResponse.success(res, { data: risk });
});
