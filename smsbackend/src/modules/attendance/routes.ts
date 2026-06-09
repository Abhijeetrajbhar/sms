import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.post('/bulk', teacherOrAdmin, requireAdminPermissionWhenAdmin('attendance:update'), controller.bulkMark);
router.patch('/:id', teacherOrAdmin, requireAdminPermissionWhenAdmin('attendance:update'), controller.updateAttendance);
router.get('/student/:studentId', requireAdminPermissionWhenAdmin('attendance:view'), requireStudentAccess(), controller.getStudentAttendance);
router.get('/student/:studentId/summary', requireAdminPermissionWhenAdmin('attendance:view'), requireStudentAccess(), controller.getSummary);
router.get('/student/:studentId/heatmap', requireAdminPermissionWhenAdmin('attendance:view'), requireStudentAccess(), controller.getHeatmap);
router.get('/class/:classId', teacherOrAdmin, requireAdminPermissionWhenAdmin('attendance:view'), controller.getClassAttendance);

export default router;
