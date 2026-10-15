import { Response } from 'express';
import { UserService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { Role, UserStatus } from '@prisma/client';
import { AppError } from '../../utils/AppError';

const service = new UserService();

export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await service.createUser(req.body, req.user!.id, req);
  ApiResponse.created(res, {
    message: user.invitationDeferred
      ? 'Pending user created. Send the invitation after profile setup is complete.'
      : user.invitationDelivered
      ? 'User created and invitation sent'
      : 'User created, but invitation email failed. Use the development activation link or resend after configuring SMTP.',
    data: user,
  });
});

export const getPermissionCatalog = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  ApiResponse.success(res, { data: service.getPermissionCatalog() });
});

export const inviteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.inviteUser(req.params.id, req.user!.id, req);
  ApiResponse.success(res, {
    message: result.invitationDelivered
      ? 'Invitation sent successfully'
      : 'Invitation created, but email delivery failed. You can copy the activation link directly.',
    data: result,
  });
});

export const getActivationLink = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getActivationLink(req.params.id, req.user!.id, req);
  ApiResponse.success(res, {
    message: 'Activation link generated successfully',
    data: result,
  });
});

export const updatePermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : [];
  const updated = await service.updatePermissions(req.params.id, permissions, req.body.isSuperAdmin, req.user!.id, req);
  ApiResponse.success(res, { message: 'Admin permissions updated', data: updated });
});

export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await service.getUsers(req);
  ApiResponse.success(res, result);
});

export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await service.getUserById(req.params.id);
  ApiResponse.success(res, { data: user });
});

export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const updated = await service.updateUser(req.params.id, req.body, req.user!.id, req);
  ApiResponse.success(res, { message: 'User updated', data: updated });
});

export const uploadAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) throw AppError.badRequest('No file uploaded');
  const result = await service.uploadAvatar(req.params.id, req.file, req.user!.id);
  ApiResponse.success(res, { message: 'Avatar uploaded', data: result });
});

export const changeRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  if (!Object.values(Role).includes(role)) throw AppError.badRequest('Invalid role');
  const updated = await service.changeUserRole(req.params.id, role, req.user!.id, req);
  ApiResponse.success(res, { message: 'Role updated', data: updated });
});

export const setStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!Object.values(UserStatus).includes(status)) throw AppError.badRequest('Invalid status');
  const updated = await service.setUserStatus(req.params.id, status, req.user!.id, req);
  ApiResponse.success(res, { message: 'Status updated', data: updated });
});

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.deleteUser(req.params.id, req.user!.id, req);
  ApiResponse.success(res, { message: 'User deleted' });
});

export const restoreUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.restoreUser(req.params.id, req.user!.id, req);
  ApiResponse.success(res, { message: 'User restored' });
});
