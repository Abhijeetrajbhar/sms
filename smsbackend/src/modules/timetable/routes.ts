import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly, teacherOrAdmin } from '../../middlewares/role.middleware';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createTimetableSchema, createTimetableSlotSchema } from './validation';

const router = Router();
router.use(authenticate);

router.get('/', adminOnly, requireAdminPermission('timetable:manage'), controller.listTimetables);
router.get('/management-options', adminOnly, requireAdminPermission('timetable:manage'), controller.getManagementOptions);
router.post('/', adminOnly, requireAdminPermission('timetable:manage'), validate(createTimetableSchema), controller.createTimetable);
router.post('/:id/slots', adminOnly, requireAdminPermission('timetable:manage'), validate(createTimetableSlotSchema), controller.addSlot);
router.delete('/:id/slots/:slotId', adminOnly, requireAdminPermission('timetable:manage'), controller.deleteSlot);
router.get('/class/:classId', requireAdminPermissionWhenAdmin('timetable:manage'), controller.getClassTimetable);
router.get('/my-schedule', teacherOrAdmin, requireAdminPermissionWhenAdmin('timetable:manage'), controller.getMyTimetable);
router.get('/my-schedule/today', teacherOrAdmin, requireAdminPermissionWhenAdmin('timetable:manage'), controller.getMyToday);

export default router;
