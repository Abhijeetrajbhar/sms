const test = require('node:test');
const assert = require('node:assert/strict');
const { Role, AdmissionStatus, AttendanceStatus, LeaveRequestType, LeaveRequestStatus } = require('@prisma/client');

// Import validation schemas from dist
const { createUserSchema, updatePermissionsSchema } = require('../dist/modules/user/validation.js');
const { ADMIN_PERMISSIONS, isAdminPermission } = require('../dist/modules/admin/permissions.js');
const { createApplicationSchema, updateStatusSchema } = require('../dist/modules/admission/validation.js');
const { createStructureSchema, generateInvoiceSchema, offlinePaymentSchema } = require('../dist/modules/fee/finance.validation.js');
const { createTimetableSchema, createTimetableSlotSchema } = require('../dist/modules/timetable/validation.js');
const { createLeaveSchema, reviewLeaveSchema } = require('../dist/modules/leave/validation.js');
const { requestRefundSchema } = require('../dist/modules/refund/validation.js');
const { bulkAttendanceSchema, updateAttendanceSchema } = require('../dist/modules/attendance/validation.js');
const { teacherRemarkSchema, generateQuestionsSchema } = require('../dist/modules/ai/ai.validation.js');

test('User Validation: creates valid users and rejects invalid email/roles', () => {
  const valid = {
    email: 'Teacher.One@School.org ',
    firstName: 'Alice',
    lastName: 'Johnson',
    phone: '+1 555-123-4567',
    role: Role.TEACHER,
  };
  const parsed = createUserSchema.parse(valid);
  assert.equal(parsed.email, 'teacher.one@school.org'); // trimmed and lowercased
  assert.equal(parsed.role, Role.TEACHER);

  // Missing email
  assert.throws(() => createUserSchema.parse({ firstName: 'A', lastName: 'B', role: Role.ADMIN }));
  // Invalid role
  assert.throws(() => createUserSchema.parse({ email: 'test@school.org', firstName: 'Alice', lastName: 'Johnson', role: 'SUPERUSER' }));
  // Name too short
  assert.throws(() => createUserSchema.parse({ email: 'test@school.org', firstName: 'A', lastName: 'B', role: Role.STUDENT }));
});

test('Admin Permissions: catalogue validates all system permissions and prevents unknown keys', () => {
  assert.ok(ADMIN_PERMISSIONS.length > 20);
  assert.equal(isAdminPermission('dashboard:view'), true);
  assert.equal(isAdminPermission('users:create'), true);
  assert.equal(isAdminPermission('fees:collect'), true);
  assert.equal(isAdminPermission('nonexistent:permission'), false);

  const validPerms = { permissions: ['dashboard:view', 'results:publish'], isSuperAdmin: false };
  assert.deepEqual(updatePermissionsSchema.parse(validPerms), validPerms);

  // Unknown permission must fail validation
  assert.throws(() => updatePermissionsSchema.parse({ permissions: ['illegal:grant'] }));
});

test('Admission Validation: requires valid contact info and academic year format', () => {
  const validApp = {
    firstName: 'Daniel',
    lastName: 'Vance',
    email: 'daniel.vance@example.com',
    academicYear: '2026-2027',
  };
  const parsed = createApplicationSchema.parse(validApp);
  assert.equal(parsed.firstName, 'Daniel');
  assert.equal(parsed.academicYear, '2026-2027');

  // Rejects invalid email
  assert.throws(() => createApplicationSchema.parse({ ...validApp, email: 'bad-email' }));
  // Status transition schema
  assert.equal(updateStatusSchema.parse({ status: AdmissionStatus.ACCEPTED, reviewNotes: 'Approved by board' }).status, AdmissionStatus.ACCEPTED);
  assert.throws(() => updateStatusSchema.parse({ status: 'RANDOM_STATUS' }));
});

test('Fee & Finance Validation: creates structure and enforces offline payment rules', () => {
  const structure = {
    academicYear: '2026-2027',
    classId: 'class_id_101',
    feeType: 'Tuition Fee Q1',
    feeItems: [{ name: 'Tuition', amount: 5000 }],
    cycle: 'QUARTERLY',
    dueDate: '2026-09-30T00:00:00.000Z',
  };
  const parsedStructure = createStructureSchema.parse(structure);
  assert.equal(parsedStructure.cycle, 'QUARTERLY');

  // Enforces studentId or classId in invoice generation
  assert.throws(() => generateInvoiceSchema.parse({ structureId: 'struct_1' }), (err) => {
    return err.errors.some((e) => e.message === 'studentId or classId is required');
  });

  const validInvoiceInput = generateInvoiceSchema.parse({ structureId: 'struct_1', classId: 'cls_1' });
  assert.equal(validInvoiceInput.classId, 'cls_1');

  // Offline payment: CASH requires no referenceNumber
  const cashPayment = offlinePaymentSchema.parse({
    invoiceId: 'inv_101',
    amount: 5000,
    mode: 'CASH',
  });
  assert.equal(cashPayment.mode, 'CASH');

  // Offline payment: BANK_TRANSFER or UPI requires referenceNumber
  assert.throws(() => offlinePaymentSchema.parse({
    invoiceId: 'inv_101',
    amount: 5000,
    mode: 'BANK_TRANSFER',
  }), (err) => {
    return err.errors.some((e) => e.path.includes('referenceNumber'));
  });

  const validBankPayment = offlinePaymentSchema.parse({
    invoiceId: 'inv_101',
    amount: 5000,
    mode: 'BANK_TRANSFER',
    referenceNumber: 'UTR-998822',
  });
  assert.equal(validBankPayment.referenceNumber, 'UTR-998822');
});

test('Timetable Validation: enforces 24h time format and chronological start-end ordering', () => {
  const validTimetable = {
    name: 'Class 10-A Timetable',
    classId: 'cls_10a',
    academicYear: '2026-2027',
  };
  assert.ok(createTimetableSchema.parse(validTimetable));

  // Invalid academic year format
  assert.throws(() => createTimetableSchema.parse({ ...validTimetable, academicYear: '2026/27' }));

  const validSlot = {
    classId: 'cls_10a',
    subjectId: 'sub_math',
    teacherId: 'tch_smith',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:00',
    room: 'Room 101',
  };
  assert.ok(createTimetableSlotSchema.parse(validSlot));

  // Rejects when endTime is earlier than startTime
  assert.throws(() => createTimetableSlotSchema.parse({
    ...validSlot,
    startTime: '11:00',
    endTime: '10:00',
  }), (err) => {
    return err.errors.some((e) => e.message.includes('End time must be after start time'));
  });

  // Rejects invalid time format
  assert.throws(() => createTimetableSlotSchema.parse({
    ...validSlot,
    startTime: '9:00 AM',
    endTime: '10:00 AM',
  }));
});

test('Leave Request Validation: enforces start and end date logic and status updates', () => {
  const validLeave = {
    type: LeaveRequestType.SICK,
    startDate: '2026-11-20',
    endDate: '2026-11-22',
    reason: 'Medical consultation and recovery',
  };
  const parsed = createLeaveSchema.parse(validLeave);
  assert.ok(parsed.startDate <= parsed.endDate);

  // End date before start date rejected
  assert.throws(() => createLeaveSchema.parse({
    ...validLeave,
    startDate: '2026-11-25',
    endDate: '2026-11-22',
  }), (err) => {
    return err.errors.some((e) => e.message.includes('End date must be on or after start date'));
  });

  // Review status
  assert.equal(reviewLeaveSchema.parse({ status: LeaveRequestStatus.APPROVED, reviewNotes: 'Granted' }).status, LeaveRequestStatus.APPROVED);
  assert.throws(() => reviewLeaveSchema.parse({ status: 'PENDING' }));
});

test('Refund Request Validation: verifies positive amounts and non-empty reasons', () => {
  const validRefund = {
    invoiceId: 'inv_3344',
    amount: 1500,
    reason: 'Overpayment on tuition fee',
  };
  const parsed = requestRefundSchema.parse(validRefund);
  assert.equal(parsed.amount, 1500);

  // Negative amount
  assert.throws(() => requestRefundSchema.parse({ ...validRefund, amount: -500 }));
  // Zero amount
  assert.throws(() => requestRefundSchema.parse({ ...validRefund, amount: 0 }));
  // Reason too short
  assert.throws(() => requestRefundSchema.parse({ ...validRefund, reason: 'No' }));
});

test('Attendance Validation: validates bulk attendance records and statuses', () => {
  const validBulk = {
    classId: 'class_99',
    date: '2026-11-18',
    entries: [
      { studentId: 'std_01', status: AttendanceStatus.PRESENT },
      { studentId: 'std_02', status: AttendanceStatus.LATE, remarks: 'Bus delay' },
      { studentId: 'std_03', status: AttendanceStatus.ABSENT },
    ],
  };
  const parsed = bulkAttendanceSchema.parse(validBulk);
  assert.equal(parsed.entries.length, 3);

  // Empty entries array rejected
  assert.throws(() => bulkAttendanceSchema.parse({ ...validBulk, entries: [] }));
});

test('AI Input Validation: verifies prompt arguments and question generator limits', () => {
  const validRemark = {
    academicYear: '2026-2027',
    term: 'Term 1',
  };
  assert.ok(teacherRemarkSchema.parse(validRemark));

  const validQuestions = {
    subject: 'Physics',
    topic: 'Thermodynamics',
    gradeLevel: 'Grade 11',
    count: 10,
    difficulty: 'medium',
  };
  const parsedQ = generateQuestionsSchema.parse(validQuestions);
  assert.equal(parsedQ.count, 10);

  // Count exceeds max limit (20)
  assert.throws(() => generateQuestionsSchema.parse({ ...validQuestions, count: 50 }));
});

