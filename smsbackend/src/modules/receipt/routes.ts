import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import * as controller from './controller';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate, authorize(Role.ADMIN, Role.STUDENT, Role.PARENT));

router.get('/:receiptId', requireAdminPermissionWhenAdmin('fees:view'), controller.getReceipt);
router.get('/:receiptId/download', requireAdminPermissionWhenAdmin('receipts:download'), controller.downloadReceipt);

export default router;
