import { NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from './auth.middleware';
import { assertStudentSelf } from '../modules/student/access';
import { assertTeacherStudentAccess } from '../modules/teacher/access';
import { assertParentStudentAccess } from '../modules/parent/access';

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
      await assertStudentSelf(req.user, studentId);
      next();
      return;
    }

    if (req.user.role === 'TEACHER') {
      await assertTeacherStudentAccess(req.user, studentId);
      next();
      return;
    }

    if (req.user.role === 'PARENT') {
      await assertParentStudentAccess(req.user, studentId);
      next();
      return;
    }

    throw AppError.forbidden();
  } catch (error) {
    next(error);
  }
};
