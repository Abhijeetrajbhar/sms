import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { paymentRateLimit } from '../../middlewares/rateLimit.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './controller';
import { createOrderSchema, verifyPaymentSchema } from './validation';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate, authorize(Role.ADMIN, Role.STUDENT, Role.PARENT));

router.post('/create-order', requireAdminPermissionWhenAdmin('fees:collect'), paymentRateLimit, validate(createOrderSchema), controller.createOrder);
router.post('/verify', requireAdminPermissionWhenAdmin('payments:verify'), paymentRateLimit, validate(verifyPaymentSchema), controller.verify);
router.get('/history', requireAdminPermissionWhenAdmin('fees:view'), controller.history);
router.get('/:id', requireAdminPermissionWhenAdmin('fees:view'), controller.getAttempt);
router.post('/:id/refresh-status', requireAdminPermissionWhenAdmin('payments:verify'), paymentRateLimit, controller.refreshStatus);

export default router;
