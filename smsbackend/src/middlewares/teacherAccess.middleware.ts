import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import {
  assertClassTeacherAccess,
  assertTeacherAssignmentOwnership,
  assertTeacherClassAccess,
  assertTeacherStudentAccess,
  assertTeacherSubjectAccess,
} from '../modules/teacher/access';
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

export const requireAssignedSubject = (
  classKey = 'classId',
  subjectKey = 'subjectId',
  source: Source = 'body'
) => async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw AppError.unauthorized();
    await assertTeacherSubjectAccess(req.user, value(req, source, classKey), value(req, source, subjectKey));
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAssignedStudent = (key = 'studentId', source: Source = 'params') =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      await assertTeacherStudentAccess(req.user, value(req, source, key));
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireTeacherOwnership = (key = 'id') =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      await assertTeacherAssignmentOwnership(req.user, value(req, 'params', key));
      next();
    } catch (error) {
      next(error);
    }
  };
