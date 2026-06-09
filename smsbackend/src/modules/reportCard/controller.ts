// controller.ts
import { Response } from 'express';
import { ReportCardService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new ReportCardService();

export const generateReportCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reportCard = await service.generateReportCard(req.body);
  ApiResponse.created(res, {
    message: 'Report card generation queued. PDF will be ready shortly.',
    data: reportCard,
  });
});

export const getReportCard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { studentId, academicYear, term } = req.query as Record<string, string>;
  const reportCard = await service.getReportCard(studentId, academicYear, term);
  ApiResponse.success(res, { data: reportCard });
});

export const getStudentReportCards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reportCards = await service.getStudentReportCards(req.params.studentId);
  ApiResponse.success(res, { data: reportCards });
});
