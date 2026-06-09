import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { RefundService } from './service';

const service = new RefundService();

export const requestRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.request(req.body, req.user!.id, req);
  ApiResponse.created(res, { message: 'Refund request created', data });
});

export const listRefunds = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.list(req));
});

export const approveRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { message: 'Refund approved', data: await service.approve(req.params.id, req.user!.id, req) });
});

export const rejectRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { message: 'Refund rejected', data: await service.reject(req.params.id, req.body.reason, req.user!.id, req) });
});

export const processRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { message: 'Refund processed', data: await service.process(req.params.id, req.user!.id, req) });
});
