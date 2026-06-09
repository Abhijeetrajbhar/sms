import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireAdminPermissionWhenAdmin('subjects:manage'), controller.getSubjects);
router.post('/', adminOnly, requireAdminPermission('subjects:manage'), controller.createSubject);
router.patch('/:id', adminOnly, requireAdminPermission('subjects:manage'), controller.updateSubject);

export default router;
