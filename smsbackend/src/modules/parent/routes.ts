import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', adminOnly, requireAdminPermission('parents:view'), controller.getParents);
router.post('/onboard', adminOnly, requireAdminPermission('parents:create'), controller.onboardParent);
router.post('/', adminOnly, requireAdminPermission('parents:create'), controller.createProfile);
router.get('/me/dashboard', authorize(Role.PARENT), controller.getMyDashboard);
router.get('/me/children', authorize(Role.PARENT), controller.getMyChildren);
router.get('/me/children/:studentId/profile', authorize(Role.PARENT), controller.getChildProfile);
router.get('/my-children', authorize(Role.PARENT), controller.getMyChildren);
router.get('/:id', requireAdminPermissionWhenAdmin('parents:view'), controller.getParentById);

export default router;
