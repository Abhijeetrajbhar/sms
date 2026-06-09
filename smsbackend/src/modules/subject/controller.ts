import { Response } from 'express';
import { SubjectService } from '../class/service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const subjectService = new SubjectService();

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
