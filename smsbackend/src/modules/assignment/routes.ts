import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { teacherOrAdmin, authorize } from '../../middlewares/role.middleware';
import { uploadAssignment, uploadSubmission } from '../../middlewares/upload.middleware';
import { Role } from '@prisma/client';
import { requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireAdminPermissionWhenAdmin('assignments:view'), controller.getAssignments);
router.get('/my-submissions', authorize(Role.STUDENT), controller.getMySubmissions);
router.get('/:id', requireAdminPermissionWhenAdmin('assignments:view'), controller.getAssignmentById);
router.get('/:id/submissions', teacherOrAdmin, requireAdminPermissionWhenAdmin('assignments:view'), controller.getAssignmentSubmissions);
router.post('/', teacherOrAdmin, requireAdminPermissionWhenAdmin('assignments:manage'), uploadAssignment, controller.createAssignment);
router.patch('/:id', teacherOrAdmin, requireAdminPermissionWhenAdmin('assignments:manage'), controller.updateAssignment);
router.delete('/:id', teacherOrAdmin, requireAdminPermissionWhenAdmin('assignments:manage'), controller.deleteAssignment);
router.post('/:id/submit', authorize(Role.STUDENT), uploadSubmission, controller.submitAssignment);
router.patch('/:id/submissions/:submissionId/grade', teacherOrAdmin, requireAdminPermissionWhenAdmin('assignments:manage'), controller.gradeSubmission);

export default router;
