// controller.ts
import { Response } from 'express';
import { TeacherService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new TeacherService();

export const createProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await service.createProfile(req.body);
  ApiResponse.created(res, { message: 'Teacher profile created', data: profile });
});

export const onboardTeacher = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.onboardTeacher(req.body, req.user!.id, req);
  ApiResponse.created(res, {
    message: result.credentialDelivery === 'TEMP_PASSWORD'
      ? 'Teacher onboarded successfully with temporary credentials'
      : 'Teacher onboarded and invitation dispatched',
    data: result,
  });
});

export const getTeachers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getTeachers(req);
  ApiResponse.success(res, result);
});

export const getTeacherById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const teacher = await service.getTeacherById(req.params.id, req.user!);
  ApiResponse.success(res, { data: teacher });
});

export const assignSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { classId, subjectId } = req.body;
  const result = await service.assignSubject(req.params.id, classId, subjectId, req.user!.id);
  ApiResponse.success(res, { message: 'Subject assigned', data: result });
});

export const getAssignedClasses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const classes = await service.getAssignedClasses(req.params.id, req.user!);
  ApiResponse.success(res, { data: classes });
});

export const getClassAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const analytics = await service.getClassAnalytics(req.params.id, req.params.classId, req.user!);
  ApiResponse.success(res, { data: analytics });
});

export const getMyDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getMyDashboard(req.user!.id) });
});

export const getMyClasses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getMyClasses(req.user!.id) });
});

export const getMySubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getMySubjects(req.user!.id) });
});

export const getMyStudents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.getMyStudents(req.user!.id, req));
});
