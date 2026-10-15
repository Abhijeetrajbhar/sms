import { Router } from 'express';
import * as controller from './ai.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin } from '../../middlewares/role.middleware';
import { aiRateLimit } from '../../middlewares/rateLimit.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { generateQuestionsSchema, teacherRemarkSchema } from './ai.validation';

const router = Router();
router.use(authenticate, aiRateLimit);

router.get('/student/:studentId/summary', requireAdminPermissionWhenAdmin('reports:view'), requireStudentAccess(), controller.generateStudentSummary);
router.post('/student/:studentId/remark', teacherOrAdmin, requireAdminPermissionWhenAdmin('reports:view'), requireStudentAccess(), validate(teacherRemarkSchema), controller.generateTeacherRemark);
router.get('/student/:studentId/attendance-explain', teacherOrAdmin, requireAdminPermissionWhenAdmin('reports:view'), requireStudentAccess(), controller.explainAttendance);
router.get('/student/:studentId/risk-explain', teacherOrAdmin, requireAdminPermissionWhenAdmin('reports:view'), requireStudentAccess(), controller.explainRisk);
router.post('/questions/generate', teacherOrAdmin, requireAdminPermissionWhenAdmin('reports:view'), validate(generateQuestionsSchema), controller.generateQuestions);

export default router;
