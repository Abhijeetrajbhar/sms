import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, authorize, teacherOrAdmin } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', teacherOrAdmin, requireAdminPermissionWhenAdmin('teachers:view'), controller.getTeachers);
router.post('/', adminOnly, requireAdminPermission('teachers:create'), controller.createProfile);
router.get('/me/dashboard', authorize(Role.TEACHER), controller.getMyDashboard);
router.get('/me/classes', authorize(Role.TEACHER), controller.getMyClasses);
router.get('/me/subjects', authorize(Role.TEACHER), controller.getMySubjects);
router.get('/me/students', authorize(Role.TEACHER), controller.getMyStudents);
router.get('/:id', requireAdminPermissionWhenAdmin('teachers:view'), controller.getTeacherById);
router.post('/:id/assign-subject', adminOnly, requireAdminPermission('teachers:update'), controller.assignSubject);
router.get('/:id/classes', requireAdminPermissionWhenAdmin('teachers:view'), controller.getAssignedClasses);
router.get('/:id/classes/:classId/analytics', teacherOrAdmin, requireAdminPermissionWhenAdmin('teachers:view'), controller.getClassAnalytics);

export default router;
