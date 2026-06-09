import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.post('/', adminOnly, requireAdminPermission('timetable:manage'), controller.createTimetable);
router.post('/:id/slots', adminOnly, requireAdminPermission('timetable:manage'), controller.addSlot);
router.delete('/:id/slots/:slotId', adminOnly, requireAdminPermission('timetable:manage'), controller.deleteSlot);
router.get('/class/:classId', requireAdminPermissionWhenAdmin('timetable:manage'), controller.getClassTimetable);
router.get('/my-schedule', teacherOrAdmin, requireAdminPermissionWhenAdmin('timetable:manage'), controller.getMyTimetable);
router.get('/my-schedule/today', teacherOrAdmin, requireAdminPermissionWhenAdmin('timetable:manage'), controller.getMyToday);

export default router;
