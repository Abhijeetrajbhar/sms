import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { allRoles, adminOnly } from '../../middlewares/role.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './controller';
import { createCalendarEventSchema, updateCalendarEventSchema } from './validation';

const router = Router();
router.use(authenticate, allRoles);
router.get('/', controller.list);
router.post('/', adminOnly, requireAdminPermission('calendar:manage'), validate(createCalendarEventSchema), controller.create);
router.patch('/:id', adminOnly, requireAdminPermission('calendar:manage'), validate(updateCalendarEventSchema), controller.update);
router.delete('/:id', adminOnly, requireAdminPermission('calendar:manage'), controller.remove);
export default router;
