import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, authorize } from '../../middlewares/role.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { Role } from '@prisma/client';
import { createLeaveSchema, reviewLeaveSchema } from './validation';
import * as controller from './controller';

const router = Router();
router.use(authenticate);
router.get('/', authorize(Role.ADMIN, Role.STUDENT, Role.TEACHER), controller.list);
router.post('/', authorize(Role.STUDENT, Role.TEACHER), validate(createLeaveSchema), controller.create);
router.patch('/:id/cancel', authorize(Role.STUDENT, Role.TEACHER), controller.cancel);
router.patch('/:id/review', adminOnly, requireAdminPermission('leaves:manage'), validate(reviewLeaveSchema), controller.review);
export default router;
