// controller.ts
import { Response } from 'express';
import { ClassService, SubjectService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const classService = new ClassService();
const subjectService = new SubjectService();

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

// Subjects
export const createSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subject = await subjectService.createSubject(req.body);
  ApiResponse.created(res, { message: 'Subject created', data: subject });
});

export const getSubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subjects = await subjectService.getSubjects(req.user!);
  ApiResponse.success(res, { data: subjects });
});

export const updateSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await subjectService.updateSubject(req.params.id, req.body);
  ApiResponse.success(res, { message: 'Subject updated', data: updated });
});
