// controller.ts
import { Response } from 'express';
import { TimetableService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new TimetableService();

export const createTimetable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const timetable = await service.createTimetable(req.body);
  ApiResponse.created(res, { message: 'Timetable created', data: timetable });
});

export const addSlot = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const slot = await service.addSlot(req.params.id, req.body);
  ApiResponse.created(res, { message: 'Slot added', data: slot });
});

export const getClassTimetable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const timetable = await service.getClassTimetable(req.params.classId, req.user!);
  ApiResponse.success(res, { data: timetable });
});

export const getMyTimetable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const timetable = await service.getTeacherTimetable(req.user!.id);
  ApiResponse.success(res, { data: timetable });
});

export const getMyToday = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getTeacherToday(req.user!.id) });
});

export const deleteSlot = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.deleteSlot(req.params.slotId);
  ApiResponse.success(res, { message: 'Slot deleted' });
});
