import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { FinanceService } from './finance.service';

const service = new FinanceService();

export const createStructure = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.createStructure(req.body, req.user!.id, req);
  ApiResponse.created(res, { message: 'Fee structure created', data });
});

export const listStructures = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.listStructures(req));
});

export const getStructure = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getStructure(req.params.id) });
});

export const updateStructure = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.updateStructure(req.params.id, req.body, req.user!.id, req);
  ApiResponse.success(res, { message: 'Fee structure updated', data });
});

export const deactivateStructure = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.deactivateStructure(req.params.id, req.user!.id, req);
  ApiResponse.success(res, { message: 'Fee structure deactivated', data });
});

export const generateInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.generateInvoices(req.body, req.user!.id, req);
  ApiResponse.created(res, { message: `${data.length} fee invoice(s) generated`, data });
});

export const listInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.listInvoices(req));
});

export const listStudentInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  req.query.studentId = req.params.studentId;
  ApiResponse.success(res, await service.listInvoices(req));
});

export const getInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.getInvoice(req.params.id, req.user!) });
});

export const updateInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.updateInvoice(req.params.id, req.body, req.user!.id, req);
  ApiResponse.success(res, { message: 'Fee invoice updated', data });
});

export const createOfflinePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.createOfflinePayment(req.body, req.user!.id, req);
  ApiResponse.created(res, { message: 'Offline payment submitted for verification', data });
});

export const listOfflinePayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, await service.listOfflinePayments(req));
});

export const approveOfflinePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.approveOfflinePayment(req.params.id, req.user!.id, req);
  ApiResponse.success(res, { message: 'Offline payment verified', data });
});

export const rejectOfflinePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await service.rejectOfflinePayment(req.params.id, req.body.reason, req.user!.id, req);
  ApiResponse.success(res, { message: 'Offline payment rejected', data });
});

export const reportSummary = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.reportSummary() });
});

export const reportDues = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.reportDues(req) });
});

export const reportClassWise = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.reportClassWise() });
});

export const reportStudentWise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.reportStudentWise(req) });
});

export const reportSettlements = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: await service.reportSettlements() });
});
