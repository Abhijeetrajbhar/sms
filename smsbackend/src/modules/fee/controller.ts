import { Response } from 'express';
import { FeeService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const service = new FeeService();

export const createFee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const fee = await service.createFee(req.body);
  ApiResponse.created(res, { message: 'Fee created', data: fee });
});

export const createClassFees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.createClassFees(req.body);
  ApiResponse.created(res, { message: `Fees created for ${result.created} students`, data: result });
});

export const recordPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.recordPayment(req.params.id, req.body);
  ApiResponse.success(res, { message: 'Payment recorded', data: result });
});

export const waiveFee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const fee = await service.waiveFee(req.params.id, req.body.reason);
  ApiResponse.success(res, { message: 'Fee waived', data: fee });
});

export const getFees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getFees(req);
  ApiResponse.success(res, result);
});

export const updateOverdue = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const result = await service.updateOverdueFees();
  ApiResponse.success(res, { message: `${result.count} fees marked as overdue` });
});

export const getCollectionSummary = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const summary = await service.getCollectionSummary();
  ApiResponse.success(res, { data: summary });
});
