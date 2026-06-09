import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { adminOnly } from '../../middlewares/role.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { validate } from '../../middlewares/validate.middleware';
import { requireStudentAccess } from '../../middlewares/studentAccess.middleware';
import * as financeController from './finance.controller';
import {
  createStructureSchema,
  generateInvoiceSchema,
  offlinePaymentSchema,
  rejectOfflinePaymentSchema,
  updateInvoiceSchema,
  updateStructureSchema,
} from './finance.validation';
import { requireAdminPermission, requireAdminPermissionWhenAdmin } from '../../middlewares/adminPermission.middleware';

const router = Router();
router.use(authenticate);

router.post('/structures', adminOnly, requireAdminPermission('fees:create'), validate(createStructureSchema), financeController.createStructure);
router.get('/structures', adminOnly, requireAdminPermission('fees:view'), financeController.listStructures);
router.get('/structures/:id', adminOnly, requireAdminPermission('fees:view'), financeController.getStructure);
router.patch('/structures/:id', adminOnly, requireAdminPermission('fees:update'), validate(updateStructureSchema), financeController.updateStructure);
router.delete('/structures/:id', adminOnly, requireAdminPermission('fees:update'), financeController.deactivateStructure);

router.post('/invoices/generate', adminOnly, requireAdminPermission('fees:create'), validate(generateInvoiceSchema), financeController.generateInvoices);
router.get('/invoices', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('fees:view'), financeController.listInvoices);
router.get('/invoices/:id', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('fees:view'), financeController.getInvoice);
router.patch('/invoices/:id', adminOnly, requireAdminPermission('fees:update'), validate(updateInvoiceSchema), financeController.updateInvoice);
router.get('/students/:studentId/invoices', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('fees:view'), requireStudentAccess(), financeController.listStudentInvoices);

router.post('/offline-payments', adminOnly, requireAdminPermission('fees:collect'), validate(offlinePaymentSchema), financeController.createOfflinePayment);
router.get('/offline-payments', adminOnly, requireAdminPermission('payments:verify'), financeController.listOfflinePayments);
router.post('/offline-payments/:id/approve', adminOnly, requireAdminPermission('payments:verify'), financeController.approveOfflinePayment);
router.post('/offline-payments/:id/reject', adminOnly, requireAdminPermission('payments:verify'), validate(rejectOfflinePaymentSchema), financeController.rejectOfflinePayment);

router.get('/reports/summary', adminOnly, requireAdminPermission('reports:view'), financeController.reportSummary);
router.get('/reports/class-wise', adminOnly, requireAdminPermission('reports:view'), financeController.reportClassWise);
router.get('/reports/student-wise', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('reports:view'), financeController.reportStudentWise);
router.get('/reports/dues', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('fees:view'), financeController.reportDues);
router.get('/reports/settlements', adminOnly, requireAdminPermission('reports:view'), financeController.reportSettlements);

router.get('/', authorize(Role.ADMIN, Role.STUDENT, Role.PARENT), requireAdminPermissionWhenAdmin('fees:view'), controller.getFees);
router.post('/', adminOnly, requireAdminPermission('fees:create'), controller.createFee);
router.post('/class', adminOnly, requireAdminPermission('fees:create'), controller.createClassFees);
router.get('/summary', adminOnly, requireAdminPermission('fees:view'), controller.getCollectionSummary);
router.patch('/update-overdue', adminOnly, requireAdminPermission('fees:update'), controller.updateOverdue);
router.post('/:id/pay', adminOnly, requireAdminPermission('fees:collect'), controller.recordPayment);
router.patch('/:id/waive', adminOnly, requireAdminPermission('fees:update'), controller.waiveFee);

export default router;
