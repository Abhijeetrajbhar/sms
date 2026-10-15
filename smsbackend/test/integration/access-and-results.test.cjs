if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required. Use a dedicated disposable MongoDB database.');
}

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.ENABLE_QUEUES = 'false';
process.env.JWT_ACCESS_SECRET = 'integration-test-access-secret-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'integration-test-refresh-secret-that-is-long-enough';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@example.com';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../../dist/config/database.js');
const { createApp } = require('../../dist/app.js');
const { hashPassword } = require('../../dist/utils/password.js');
const { generateTokenPair } = require('../../dist/utils/jwt.js');

let server;
let baseUrl;
let fixture;

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.result.deleteMany();
  await prisma.subjectTeacher.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser({ email, role, permissions = [], password = 'Password123!' }) {
  return prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      role,
      status: 'ACTIVE',
      firstName: role,
      lastName: 'Integration',
      permissions,
      isEmailVerified: true,
    },
  });
}

function accessToken(user) {
  return generateTokenPair({ userId: user.id, email: user.email, role: user.role }).accessToken;
}

async function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

test.before(async () => {
  await prisma.$connect();
  await clearDatabase();

  const admin = await createUser({ email: 'admin.integration@example.com', role: 'ADMIN', permissions: ['results:publish'] });
  const parentUser = await createUser({ email: 'parent.integration@example.com', role: 'PARENT' });
  const studentUser = await createUser({ email: 'student.integration@example.com', role: 'STUDENT' });
  const unrelatedStudentUser = await createUser({ email: 'other.integration@example.com', role: 'STUDENT' });
  const classRoom = await prisma.class.create({ data: { name: 'Grade 10', section: 'A', gradeLevel: '10', academicYear: '2026-2027' } });
  const subject = await prisma.subject.create({ data: { name: 'Mathematics', code: 'MATH-INT-10' } });
  const parent = await prisma.parentProfile.create({ data: { userId: parentUser.id, relation: 'Guardian' } });
  const student = await prisma.studentProfile.create({ data: { userId: studentUser.id, studentCode: 'INT-1001', classId: classRoom.id, parentIds: [parent.id] } });
  const unrelatedStudent = await prisma.studentProfile.create({ data: { userId: unrelatedStudentUser.id, studentCode: 'INT-1002', classId: classRoom.id, parentIds: [] } });
  const result = await prisma.result.create({
    data: {
      studentId: student.id,
      classId: classRoom.id,
      subjectId: subject.id,
      examType: 'Midterm',
      academicYear: '2026-2027',
      term: 'Term 1',
      marksObtained: 88,
      maxMarks: 100,
      percentage: 88,
      grade: 'A',
      gpa: 3.7,
      status: 'SUBMITTED',
      enteredById: admin.id,
    },
  });

  fixture = { admin, parentUser, student, unrelatedStudent, classRoom, subject, result };
  server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clearDatabase();
  await prisma.$disconnect();
});

test('authenticates an active user and persists the refresh session', async () => {
  const response = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: fixture.parentUser.email, password: 'Password123!' }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.id, fixture.parentUser.id);
  assert.ok(body.data.accessToken);
  assert.equal(await prisma.session.count({ where: { userId: fixture.parentUser.id, isValid: true } }), 1);
});

test('enforces parent-child data isolation at the HTTP boundary', async () => {
  const token = accessToken(fixture.parentUser);
  const allowed = await api(`/api/v1/parents/me/children/${fixture.student.id}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const denied = await api(`/api/v1/parents/me/children/${fixture.unrelatedStudent.id}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).data.id, fixture.student.id);
  assert.equal(denied.status, 403);
  assert.match((await denied.json()).message, /linked students/i);
});

test('publishes only submitted results and locks them for further editing', async () => {
  const token = accessToken(fixture.admin);
  const response = await api('/api/v1/results/publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ classId: fixture.classRoom.id, examType: 'Midterm', term: 'Term 1', academicYear: '2026-2027' }),
  });
  const body = await response.json();
  const updated = await prisma.result.findUnique({ where: { id: fixture.result.id } });

  assert.equal(response.status, 200);
  assert.equal(body.data.published, 1);
  assert.equal(updated.isPublished, true);
  assert.equal(updated.status, 'LOCKED');
  assert.ok(updated.publishedAt);
});
