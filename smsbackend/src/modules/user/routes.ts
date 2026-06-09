import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadAvatar } from '../../middlewares/upload.middleware';
import { requireAdminPermission, requireSuperAdmin } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createUserSchema, updatePermissionsSchema } from './validation';

const router = Router();
router.use(authenticate);

router.get('/permissions/catalog', requireSuperAdmin, controller.getPermissionCatalog);
router.get('/', requireAdminPermission('users:view'), controller.getUsers);
router.post('/', requireAdminPermission('users:create'), validate(createUserSchema), controller.createUser);
router.get('/:id', requireAdminPermission('users:view'), controller.getUserById);
router.patch('/:id', requireAdminPermission('users:update'), controller.updateUser);
router.patch('/:id/role', requireSuperAdmin, controller.changeRole);
router.patch('/:id/permissions', requireSuperAdmin, validate(updatePermissionsSchema), controller.updatePermissions);
router.patch('/:id/status', requireAdminPermission('users:update'), controller.setStatus);
router.post('/:id/avatar', requireAdminPermission('users:update'), uploadAvatar, controller.uploadAvatar);
router.delete('/:id', requireAdminPermission('users:delete'), controller.deleteUser);
router.post('/:id/restore', requireAdminPermission('users:update'), controller.restoreUser);

export default router;
