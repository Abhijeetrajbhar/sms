const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { AttendanceStatus, RiskLevel, Grade } = require('@prisma/client');

// Import compiled dist modules
const {
  calculateGrade,
  calculateGPA,
  calculatePercentage,
  calculateOverallGPA,
  gradeToString,
} = require('../dist/utils/grading.js');

const {
  calculateAttendancePercentage,
  getAttendanceSummary,
  isLowAttendance,
} = require('../dist/utils/attendance.js');

const { calculateRiskScore } = require('../dist/utils/riskScore.js');
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateTokenPair } = require('../dist/utils/jwt.js');
const { hashPassword, comparePassword } = require('../dist/utils/password.js');
const { AppError } = require('../dist/utils/AppError.js');
const { paymentGateway } = require('../dist/modules/payment/gateway.js');

test('Grading: calculateGrade accurately maps percentage thresholds', () => {
  assert.equal(calculateGrade(100), Grade.A_PLUS);
  assert.equal(calculateGrade(95), Grade.A_PLUS);
  assert.equal(calculateGrade(94.9), Grade.A);
  assert.equal(calculateGrade(85), Grade.A);
  assert.equal(calculateGrade(84.9), Grade.B_PLUS);
  assert.equal(calculateGrade(75), Grade.B_PLUS);
  assert.equal(calculateGrade(74.9), Grade.B);
  assert.equal(calculateGrade(65), Grade.B);
  assert.equal(calculateGrade(64.9), Grade.C);
  assert.equal(calculateGrade(50), Grade.C);
  assert.equal(calculateGrade(49.9), Grade.D);
  assert.equal(calculateGrade(40), Grade.D);
  assert.equal(calculateGrade(39.9), Grade.F);
  assert.equal(calculateGrade(0), Grade.F);
});

test('Grading: calculateGPA accurately maps percentage to 4.0 scale', () => {
  assert.equal(calculateGPA(98), 4.0);
  assert.equal(calculateGPA(95), 4.0);
  assert.equal(calculateGPA(90), 3.7);
  assert.equal(calculateGPA(85), 3.7);
  assert.equal(calculateGPA(80), 3.3);
  assert.equal(calculateGPA(75), 3.3);
  assert.equal(calculateGPA(70), 3.0);
  assert.equal(calculateGPA(65), 3.0);
  assert.equal(calculateGPA(60), 2.7);
  assert.equal(calculateGPA(55), 2.7);
  assert.equal(calculateGPA(52), 2.3);
  assert.equal(calculateGPA(50), 2.3);
  assert.equal(calculateGPA(48), 2.0);
  assert.equal(calculateGPA(45), 2.0);
  assert.equal(calculateGPA(42), 1.7);
  assert.equal(calculateGPA(40), 1.7);
  assert.equal(calculateGPA(35), 0.0);
  assert.equal(calculateGPA(0), 0.0);
});

test('Grading: calculatePercentage safely handles 0 maxMarks and rounds properly', () => {
  assert.equal(calculatePercentage(45, 50), 90);
  assert.equal(calculatePercentage(1, 3), 33.33);
  assert.equal(calculatePercentage(2, 3), 66.67);
  assert.equal(calculatePercentage(50, 0), 0);
});

test('Grading: gradeToString maps all Grade enums correctly', () => {
  assert.equal(gradeToString(Grade.A_PLUS), 'A+');
  assert.equal(gradeToString(Grade.A), 'A');
  assert.equal(gradeToString(Grade.B_PLUS), 'B+');
  assert.equal(gradeToString(Grade.B), 'B');
  assert.equal(gradeToString(Grade.C), 'C');
  assert.equal(gradeToString(Grade.D), 'D');
  assert.equal(gradeToString(Grade.F), 'F');
});

test('Grading: calculateOverallGPA computes rounded average GPA', () => {
  assert.equal(calculateOverallGPA([]), 0);
  assert.equal(calculateOverallGPA([4.0, 3.7, 3.3]), 3.67);
  assert.equal(calculateOverallGPA([3.0, 3.0, 3.0]), 3.0);
});

test('Attendance: status scoring and summary calculations', () => {
  const records = [
    { status: AttendanceStatus.PRESENT },
    { status: AttendanceStatus.LATE }, // counts as 1.0
    { status: AttendanceStatus.HALF_DAY }, // counts as 0.5
    { status: AttendanceStatus.ABSENT }, // counts as 0.0
    { status: AttendanceStatus.EXCUSED }, // neutral
  ];
  // Valid records = 5, total points = 1 + 1 + 0.5 + 0 + 0 = 2.5. 2.5 / 5 = 50%
  const pct = calculateAttendancePercentage(records);
  assert.equal(pct, 50);

  const summary = getAttendanceSummary(records);
  assert.deepEqual(summary, {
    total: 5,
    present: 1,
    absent: 1,
    late: 1,
    halfDay: 1,
    excused: 1,
    percentage: 50,
  });

  assert.equal(isLowAttendance(74.9), true);
  assert.equal(isLowAttendance(75.0), false);
  assert.equal(isLowAttendance(90.0), false);
});

test('Risk Scoring: accurately computes risk scores and categorizes into levels', () => {
  // Case 1: Excellent student (low risk)
  const stellar = calculateRiskScore({
    attendancePercentage: 96,
    averageMarks: 92,
    missingAssignments: 0,
    lateSubmissions: 0,
    totalAssignments: 10,
  });
  assert.equal(stellar.riskLevel, RiskLevel.LOW);
  assert.equal(stellar.riskScore, 0);
  assert.ok(stellar.riskFactors.includes('No significant risk factors identified'));

  // Case 2: Critical student (score >= 70)
  // attendance < 60 -> 40 pts
  // marks < 40 -> 35 pts
  // missing > 50% -> 15 pts
  // late > 40% -> 10 pts
  // total = 100 pts -> CRITICAL
  const critical = calculateRiskScore({
    attendancePercentage: 45,
    averageMarks: 32,
    missingAssignments: 8,
    lateSubmissions: 6,
    totalAssignments: 10,
  });
  assert.equal(critical.riskScore, 100);
  assert.equal(critical.riskLevel, RiskLevel.CRITICAL);
  assert.equal(critical.riskFactors.length, 4);

  // Case 3: Medium risk (score between 20 and 44)
  // attendance 72% -> 25 pts -> MEDIUM
  const moderate = calculateRiskScore({
    attendancePercentage: 72,
    averageMarks: 78,
    missingAssignments: 0,
    lateSubmissions: 0,
    totalAssignments: 10,
  });
  assert.equal(moderate.riskScore, 25);
  assert.equal(moderate.riskLevel, RiskLevel.MEDIUM);

  // Case 4: High risk (score between 45 and 69)
  // attendance 70% -> 25 pts, marks 50% -> 20 pts -> 45 pts -> HIGH
  const highRisk = calculateRiskScore({
    attendancePercentage: 70,
    averageMarks: 50,
    missingAssignments: 0,
    lateSubmissions: 0,
    totalAssignments: 10,
  });
  assert.equal(highRisk.riskScore, 45);
  assert.equal(highRisk.riskLevel, RiskLevel.HIGH);
});

test('Security & Cryptography: password hashing and verification with bcrypt', async () => {
  const plain = 'StrongP@ssw0rd2026!';
  const hashed = await hashPassword(plain);
  assert.notEqual(hashed, plain);
  assert.ok(hashed.startsWith('$2')); // bcrypt prefix

  const matches = await comparePassword(plain, hashed);
  assert.equal(matches, true);

  const wrongMatches = await comparePassword('WrongPassword123!', hashed);
  assert.equal(wrongMatches, false);
});

test('Security & Cryptography: JWT token creation, decoding, and tamper detection', () => {
  const payload = { userId: 'user-test-123', email: 'tester@school.edu', role: 'ADMIN' };
  const tokens = generateTokenPair(payload);

  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);

  const decoded = verifyAccessToken(tokens.accessToken);
  assert.equal(decoded.userId, payload.userId);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.role, payload.role);

  const decodedRefresh = verifyRefreshToken(tokens.refreshToken);
  assert.equal(decodedRefresh.userId, payload.userId);

  // Tampered token must throw AppError 401
  const tampered = tokens.accessToken.slice(0, -6) + 'abcdef';
  assert.throws(() => verifyAccessToken(tampered), (err) => {
    return err instanceof AppError && err.statusCode === 401;
  });
});

test('Finance & Razorpay: Checkout and webhook HMAC SHA-256 signature verification', () => {
  // Test checkout signature verification
  const orderId = 'order_test_998877';
  const paymentId = 'pay_test_112233';
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const validSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(paymentGateway.verifyCheckoutSignature(orderId, paymentId, validSignature), true);

  const forgedSignature = crypto.createHmac('sha256', 'wrong-secret').update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(paymentGateway.verifyCheckoutSignature(orderId, paymentId, forgedSignature), false);

  // Test webhook signature verification
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId } } } }));
  const validWebhookSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  assert.equal(paymentGateway.verifyWebhookSignature(rawBody, validWebhookSig), true);

  const tamperedBody = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
  assert.equal(paymentGateway.verifyWebhookSignature(tamperedBody, validWebhookSig), false);
});

