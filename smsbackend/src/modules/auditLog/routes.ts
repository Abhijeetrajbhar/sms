import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { getAuditLogs } from './controller';

const router = Router();
router.use(authenticate, requireAdminPermission('audit:view'));
router.get('/', getAuditLogs);

export default router;
