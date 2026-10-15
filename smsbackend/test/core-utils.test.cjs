const test = require('node:test');
const assert = require('node:assert/strict');
const { AttendanceStatus } = require('@prisma/client');
const {
  calculateAttendancePercentage,
  getAttendanceSummary,
  isLowAttendance,
} = require('../dist/utils/attendance.js');
const { AppError } = require('../dist/utils/AppError.js');

test('attendance percentage gives half-day records half credit', () => {
  const records = [
    { status: AttendanceStatus.PRESENT },
    { status: AttendanceStatus.HALF_DAY },
    { status: AttendanceStatus.ABSENT },
    { status: AttendanceStatus.LATE },
  ];
  assert.equal(calculateAttendancePercentage(records), 62.5);
  assert.deepEqual(getAttendanceSummary(records), {
    total: 4,
    present: 1,
    absent: 1,
    late: 1,
    halfDay: 1,
    excused: 0,
    percentage: 62.5,
  });
  assert.equal(isLowAttendance(62.5), true);
});

test('operational errors retain their HTTP status and details', () => {
  const error = AppError.unprocessable('Invalid marks', { marks: 'Too high' });
  assert.equal(error.statusCode, 422);
  assert.equal(error.message, 'Invalid marks');
  assert.deepEqual(error.errors, { marks: 'Too high' });
  assert.equal(error.isOperational, true);
});
