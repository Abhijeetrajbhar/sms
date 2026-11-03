import { Response } from 'express';
import { AssignmentService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new AssignmentService();

export const createAssignment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const assignment = await service.createAssignment(
    { ...req.body, teacherUserId: req.user!.id, file: req.file },
    req
  );
  ApiResponse.created(res, { message: 'Assignment created', data: assignment });
});

export const updateAssignment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.updateAssignment(req.params.id, req.body, req.user!, req);
  ApiResponse.success(res, { message: 'Assignment updated', data: updated });
});

export const deleteAssignment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.deleteAssignment(req.params.id, req.user!, req);
  ApiResponse.success(res, { message: 'Assignment deleted' });
});

export const getAssignments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getAssignments(req);
  ApiResponse.success(res, result);
});

export const getAssignmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const assignment = await service.getAssignmentById(req.params.id, req.user!);
  ApiResponse.success(res, { data: assignment });
});

export const submitAssignment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const submission = await service.submitAssignment({
    assignmentId: req.params.id,
    studentUserId: req.user!.id,
    content: req.body.content,
    file: req.file,
  });
  ApiResponse.created(res, { message: 'Assignment submitted', data: submission });
});

export const gradeSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const graded = await service.gradeSubmission(req.params.submissionId, req.body, req.user!, req);
  ApiResponse.success(res, { message: 'Submission graded', data: graded });
});

export const getMySubmissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getStudentSubmissions(req.user!.id, req);
  ApiResponse.success(res, result);
});

export const getAssignmentSubmissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getAssignmentSubmissions(req.params.id, req.user!) });
});
