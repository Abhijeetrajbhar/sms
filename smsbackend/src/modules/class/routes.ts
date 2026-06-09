import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

// Classes
router.get('/', requireAdminPermissionWhenAdmin('classes:manage'), controller.getClasses);
router.post('/', adminOnly, requireAdminPermission('classes:manage'), controller.createClass);
router.get('/:id', requireAdminPermissionWhenAdmin('classes:manage'), controller.getClassById);
router.patch('/:id', adminOnly, requireAdminPermission('classes:manage'), controller.updateClass);
router.delete('/:id', adminOnly, requireAdminPermission('classes:manage'), controller.deleteClass);
router.get('/:id/analytics', teacherOrAdmin, requireAdminPermissionWhenAdmin('classes:manage'), controller.getClassAnalytics);

export default router;
