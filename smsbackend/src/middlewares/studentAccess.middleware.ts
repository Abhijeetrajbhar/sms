import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from './auth.middleware';

type StudentIdSource = 'params' | 'query' | 'body';

export const requireStudentAccess = (
  key = 'studentId',
  source: StudentIdSource = 'params'
) => async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role === 'ADMIN') {
      next();
      return;
    }

    const studentId = String(req[source][key] || '');
    if (!studentId) throw AppError.badRequest('Student ID is required');

    if (req.user.role === 'STUDENT') {
      const { assertStudentSelf } = await import('../modules/student/access');
      await assertStudentSelf(req.user, studentId);
      next();
      return;
    }

    if (req.user.role === 'TEACHER') {
      const { assertTeacherStudentAccess } = await import('../modules/teacher/access');
      await assertTeacherStudentAccess(req.user, studentId);
      next();
      return;
    }

    if (req.user.role === 'PARENT') {
      const { assertParentStudentAccess } = await import('../modules/parent/access');
      await assertParentStudentAccess(req.user, studentId);
      next();
      return;
    }

    throw AppError.forbidden();
  } catch (error) {
    next(error);
  }
};
