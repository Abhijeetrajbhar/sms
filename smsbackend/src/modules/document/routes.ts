import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, allRoles } from '../../middlewares/role.middleware';
import { requireAdminPermission } from '../../middlewares/adminPermission.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { uploadGeneral } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './controller';
import { reviewStudentDocumentSchema, uploadStudentDocumentSchema } from './validation';

const router = Router();
router.use(authenticate, allRoles);
router.get('/student/:studentId', requireStudentAccess(), controller.list);
router.post('/student/:studentId', adminOnly, requireAdminPermission('documents:manage'), requireStudentAccess(), uploadGeneral, validate(uploadStudentDocumentSchema), controller.upload);
router.patch('/:id/review', adminOnly, requireAdminPermission('documents:manage'), validate(reviewStudentDocumentSchema), controller.review);
router.delete('/:id', adminOnly, requireAdminPermission('documents:manage'), controller.remove);
export default router;
