import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, authorize, teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { Role } from '@prisma/client';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', teacherOrAdmin, requireAdminPermissionWhenAdmin('students:view'), controller.getStudents);
router.post('/', adminOnly, requireAdminPermission('students:create'), controller.createProfile);
router.get('/me/profile', authorize(Role.STUDENT), controller.getMyProfile);
router.get('/me/dashboard', authorize(Role.STUDENT), controller.getMyDashboard);
router.get('/:id', requireAdminPermissionWhenAdmin('students:view'), requireStudentAccess('id'), controller.getStudentById);
router.post('/:id/assign-class', adminOnly, requireAdminPermission('students:update'), controller.assignToClass);
router.post('/:id/link-parent', adminOnly, requireAdminPermission('parents:link-student'), controller.linkParent);
router.get('/:id/attendance-summary', requireAdminPermissionWhenAdmin('attendance:view'), requireStudentAccess('id'), controller.getAttendanceSummary);
router.get('/:id/risk', teacherOrAdmin, requireAdminPermissionWhenAdmin('students:view'), requireStudentAccess('id'), controller.getRiskProfile);

export default router;
