import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin, adminOnly } from '../../middlewares/role.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { validate } from '../../middlewares/validate.middleware';
import {
  bulkCreateResultSchema,
  createResultSchema,
  marksStudentsQuerySchema,
  publishResultsSchema,
  saveDraftSchema,
  submitFinalSchema,
  updateResultSchema,
} from './validation';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.post('/', teacherOrAdmin, requireAdminPermissionWhenAdmin('results:create'), validate(createResultSchema), controller.createResult);
router.post('/bulk', teacherOrAdmin, requireAdminPermissionWhenAdmin('results:create'), validate(bulkCreateResultSchema), controller.bulkCreate);
router.post('/publish', adminOnly, requireAdminPermission('results:publish'), validate(publishResultsSchema), controller.publishResults);
router.get('/teacher/marks/students', authorize(Role.TEACHER), validate(marksStudentsQuerySchema, 'query'), controller.getMarksStudents);
router.get('/teacher/marks/history', authorize(Role.TEACHER), controller.getMarksHistory);
router.post('/teacher/marks/save-draft', authorize(Role.TEACHER), validate(saveDraftSchema), controller.saveDraft);
router.post('/teacher/marks/submit-final', authorize(Role.TEACHER), validate(submitFinalSchema), controller.submitFinal);
router.post('/:id/unlock', adminOnly, requireAdminPermission('results:publish'), controller.unlockResult);
router.patch('/:id', teacherOrAdmin, requireAdminPermissionWhenAdmin('results:update'), validate(updateResultSchema), controller.updateResult);
router.get('/student/:studentId', requireAdminPermissionWhenAdmin('results:view'), requireStudentAccess(), controller.getStudentResults);
router.get('/class/:classId', teacherOrAdmin, requireAdminPermissionWhenAdmin('results:view'), controller.getClassResults);

export default router;
