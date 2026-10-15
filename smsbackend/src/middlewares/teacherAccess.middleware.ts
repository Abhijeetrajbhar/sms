import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { assertClassTeacherAccess, assertTeacherClassAccess } from '../modules/teacher/access';
import { AppError } from '../utils/AppError';

type Source = 'params' | 'query' | 'body';

function value(req: AuthenticatedRequest, source: Source, key: string): string {
  return String((req[source] as Record<string, unknown>)?.[key] || '');
}

export const requireAssignedClass = (key = 'classId', source: Source = 'params', classTeacherOnly = false) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const classId = value(req, source, key);
      if (!classId) throw AppError.badRequest('Class ID is required');
      await (classTeacherOnly ? assertClassTeacherAccess(req.user, classId) : assertTeacherClassAccess(req.user, classId));
      next();
    } catch (error) {
      next(error);
    }
  };
