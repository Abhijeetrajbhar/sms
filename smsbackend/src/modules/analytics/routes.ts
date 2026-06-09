import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard', requireAdminPermissionWhenAdmin('dashboard:view'), controller.getDashboard);
router.get('/admin', requireAdminPermission('dashboard:view'), controller.getAdminAnalytics);

export default router;
