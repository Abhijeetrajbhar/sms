import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from './auth.middleware';

export const authorize = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

// Shorthand helpers
export const adminOnly = authorize(Role.ADMIN);
export const teacherOrAdmin = authorize(Role.ADMIN, Role.TEACHER);
export const studentOrAbove = authorize(Role.ADMIN, Role.TEACHER, Role.STUDENT);
export const parentOrAbove = authorize(Role.ADMIN, Role.TEACHER, Role.PARENT);
export const allRoles = authorize(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT);
