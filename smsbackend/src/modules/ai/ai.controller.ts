// ai.controller.ts
import { Response } from 'express';
import aiService from './ai.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export const generateStudentSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await aiService.generateStudentSummary(
    req.params.studentId,
    req.user!.id,
    req.user!.role
  );
  ApiResponse.success(res, { data: result });
});

export const generateTeacherRemark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await aiService.generateTeacherRemark({
    studentId: req.params.studentId,
    academicYear: req.body.academicYear,
    term: req.body.term,
  });
  ApiResponse.success(res, { data: result });
});

export const explainAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await aiService.explainAttendanceTrend(req.params.studentId);
  ApiResponse.success(res, { data: result });
});

export const generateQuestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await aiService.generateAssignmentQuestions(req.body);
  ApiResponse.success(res, { data: result });
});

export const explainRisk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await aiService.explainRiskScore(req.params.studentId);
  ApiResponse.success(res, { data: result });
});
