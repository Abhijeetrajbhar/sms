import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { paymentRateLimit } from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './controller';
import { rejectRefundSchema, requestRefundSchema } from './validation';

const router = Router();
router.use(authenticate);

router.get('/', requireAdminPermission('fees:view'), controller.listRefunds);
router.post('/', requireAdminPermission('fees:refund'), paymentRateLimit, validate(requestRefundSchema), controller.requestRefund);
router.post('/request', requireAdminPermission('fees:refund'), paymentRateLimit, validate(requestRefundSchema), controller.requestRefund);
router.post('/:id/approve', requireAdminPermission('fees:refund'), paymentRateLimit, controller.approveRefund);
router.post('/:id/reject', requireAdminPermission('fees:refund'), paymentRateLimit, validate(rejectRefundSchema), controller.rejectRefund);
router.post('/:id/process', requireAdminPermission('fees:refund'), paymentRateLimit, controller.processRefund);

export default router;
