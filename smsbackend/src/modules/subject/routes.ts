import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createSubjectSchema, updateSubjectSchema } from '../class/validation';

const router = Router();
router.use(authenticate);

router.get('/', requireAdminPermissionWhenAdmin('subjects:manage'), controller.getSubjects);
router.post('/', adminOnly, requireAdminPermission('subjects:manage'), validate(createSubjectSchema), controller.createSubject);
router.patch('/:id', adminOnly, requireAdminPermission('subjects:manage'), validate(updateSubjectSchema), controller.updateSubject);

export default router;
