import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin, adminOnly } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireAdminPermissionWhenAdmin('notices:manage'), controller.getAnnouncements);
router.post('/', teacherOrAdmin, requireAdminPermissionWhenAdmin('notices:manage'), controller.createAnnouncement);
router.patch('/:id/read', controller.markRead);
router.patch('/:id/deactivate', adminOnly, requireAdminPermission('notices:manage'), controller.deactivate);

export default router;
