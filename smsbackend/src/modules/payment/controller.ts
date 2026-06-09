import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { PaymentService } from './service';

const service = new PaymentService();

export const createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const idempotencyKey = String(req.headers['idempotency-key'] || '');
  const data = await service.createOrder(req.body.invoiceId, idempotencyKey, req.user!, req);
  ApiResponse.created(res, { message: 'Payment order ready', data });
});

export const verify = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.verifyCheckout(req.body, req.user!, req);
  ApiResponse.success(res, { message: 'Payment verification completed', data });
});

export const history = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.history(req));
});

export const getAttempt = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getAttempt(req.params.id, req.user!) });
});

export const refreshStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { message: 'Payment status refreshed', data: await service.refreshStatus(req.params.id, req.user!) });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = String(req.headers['x-razorpay-signature'] || '');
  const eventId = req.headers['x-razorpay-event-id'] ? String(req.headers['x-razorpay-event-id']) : undefined;
  const data = await service.handleWebhook(rawBody, signature, eventId);
  ApiResponse.success(res, { message: data.duplicate ? 'Webhook already processed' : 'Webhook processed', data });
});
