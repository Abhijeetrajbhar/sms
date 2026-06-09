import { Request, Response } from 'express';
import { AuthService } from './service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../utils/AppError';
import config from '../../config/env';

const service = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await service.register(req.body, req);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

  ApiResponse.created(res, {
    message: 'Registration successful',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await service.login(req.body, req);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

  ApiResponse.success(res, {
    message: 'Login successful',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw AppError.badRequest('No refresh token provided');

  await service.logout(refreshToken, req.user!.id, req);

  res.clearCookie('refreshToken');
  ApiResponse.success(res, { message: 'Logged out successfully' });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) throw AppError.unauthorized('Refresh token required');

  const tokens = await service.refreshTokens(token);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
  ApiResponse.success(res, {
    message: 'Token refreshed',
    data: { accessToken: tokens.accessToken },
  });
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await service.getCurrentUser(req.user!.id);
  ApiResponse.success(res, { data: user });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await service.changePassword(req.user!.id, req.body, req);
  res.clearCookie('refreshToken');
  ApiResponse.success(res, { message: 'Password changed successfully. Please log in again.' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.forgotPassword(req.body.email);
  ApiResponse.success(res, {
    message: 'If that email is registered, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.resetPassword(req.body.token, req.body.newPassword, req);
  ApiResponse.success(res, { message: 'Password reset successfully' });
});
