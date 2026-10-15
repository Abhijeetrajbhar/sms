import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimit } from '../../middlewares/rateLimit.middleware';
import * as controller from './controller';
import { createApplicationSchema, updateStatusSchema } from './validation';

const router = Router();

router.post('/', authRateLimit, validate(createApplicationSchema), controller.create);
router.use(authenticate, adminOnly);
router.get('/', requireAdminPermission('admissions:view'), controller.list);
router.get('/:id', requireAdminPermission('admissions:view'), controller.get);
router.patch('/:id/status', requireAdminPermission('admissions:manage'), validate(updateStatusSchema), controller.updateStatus);
router.post('/:id/enroll', requireAdminPermission('admissions:manage'), controller.enroll);

export default router;
