import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from '../utils/AppError';
import { AdminPermission } from '../modules/admin/permissions';

type AuthUser = NonNullable<AuthenticatedRequest['user']>;

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN' && (user.isSuperAdmin || user.permissions.length === 0);
}

export function hasAdminPermission(user: AuthUser, permission: AdminPermission): boolean {
  return isSuperAdmin(user) || user.permissions.includes(permission);
}

export const requireAdminPermission = (permission: AdminPermission) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role !== 'ADMIN') return next(AppError.forbidden('Admin access required'));
    if (!hasAdminPermission(req.user, permission)) {
      return next(AppError.forbidden(`Missing admin permission: ${permission}`));
    }
    next();
  };

export const requireAdminPermissionWhenAdmin = (permission: AdminPermission) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role === 'ADMIN' && !hasAdminPermission(req.user, permission)) {
      return next(AppError.forbidden(`Missing admin permission: ${permission}`));
    }
    next();
  };

export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) return next(AppError.unauthorized());
  if (!isSuperAdmin(req.user)) return next(AppError.forbidden('Super admin access required'));
  next();
};
