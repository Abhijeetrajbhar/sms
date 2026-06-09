import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { requireAssignedClass } from '../../middlewares/teacherAccess.middleware';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.post(
  '/generate',
  teacherOrAdmin,
  requireAdminPermissionWhenAdmin('results:create'),
  requireAssignedClass('classId', 'body', true),
  requireStudentAccess('studentId', 'body'),
  controller.generateReportCard
);
router.get('/', requireAdminPermissionWhenAdmin('results:view'), requireStudentAccess('studentId', 'query'), controller.getReportCard);
router.get('/student/:studentId', requireAdminPermissionWhenAdmin('results:view'), requireStudentAccess(), controller.getStudentReportCards);

export default router;
