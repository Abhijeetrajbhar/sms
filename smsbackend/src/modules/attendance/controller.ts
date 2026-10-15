// controller.ts
import { Response } from 'express';
import { AttendanceService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import prisma from '../../config/database';

const service = new AttendanceService();

export const bulkMark = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { classId, subjectId, date, entries } = req.body;
  if (!Array.isArray(entries) || !entries.length) {
    throw AppError.badRequest('Entries array is required');
  }

  // Get teacher profile
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: req.user!.id },
  });
  if (!teacherProfile && req.user!.role !== 'ADMIN') {
    throw AppError.forbidden('Teacher profile required');
  }
  let markerId = teacherProfile?.id;
  if (!markerId) {
    const assigned = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        subjects: { where: subjectId ? { subjectId } : undefined, take: 1, select: { teacherId: true } },
      },
    });
    markerId = assigned?.teacherId || assigned?.subjects[0]?.teacherId;
  }
  if (!markerId) throw AppError.unprocessable('An assigned teacher is required before admin attendance can be recorded');

  const records = await service.bulkMarkAttendance({
    classId,
    subjectId,
    date,
    entries,
    markedById: markerId,
    actorId: markerId,
    actorUserId: req.user!.id,
    user: req.user!,
    req,
  });

  ApiResponse.created(res, { message: `Attendance marked for ${records.length} students`, data: records });
});

export const updateAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.updateAttendance(req.params.id, req.body, req.user!, req);
  ApiResponse.success(res, { message: 'Attendance updated', data: updated });
});

export const getStudentAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getStudentAttendance(req.params.studentId, req);
  ApiResponse.success(res, result);
});

export const getClassAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.query;
  if (!date) throw AppError.badRequest('Date query param required');
  const records = await service.getClassAttendance(
    req.params.classId,
    date as string,
    req.user!,
    req.query.subjectId ? String(req.query.subjectId) : undefined
  );
  ApiResponse.success(res, { data: records });
});

export const getHeatmap = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { year, month } = req.query;
  const heatmap = await service.getMonthlyHeatmap(
    req.params.studentId,
    Number(year) || new Date().getFullYear(),
    Number(month) || new Date().getMonth() + 1
  );
  ApiResponse.success(res, { data: heatmap });
});

export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await service.getAttendanceSummary(req.params.studentId);
  ApiResponse.success(res, { data: summary });
});
