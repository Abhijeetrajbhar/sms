process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'mongodb://127.0.0.1:27017/edumanage-contract-test';
process.env.ENABLE_QUEUES = 'false';
process.env.JWT_ACCESS_SECRET = 'contract-test-access-secret-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'contract-test-refresh-secret-that-is-long-enough';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@example.com';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/app.js');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('exposes live and compatibility health contracts with a correlation ID', async () => {
  const requestId = 'contract-health-001';
  const response = await fetch(`${baseUrl}/health`, { headers: { 'X-Request-Id': requestId } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), requestId);
  assert.equal(body.success, true);
  assert.equal(body.message, 'EduManage API is running');

  const liveness = await fetch(`${baseUrl}/health/live`);
  assert.equal(liveness.status, 200);
  assert.deepEqual((await liveness.json()).status, 'live');
});

test('returns a traceable 401 before protected routes reach the database', async () => {
  const response = await fetch(`${baseUrl}/api/v1/students/me/profile`, {
    headers: { Authorization: 'Bearer malformed-token', 'X-Request-Id': 'contract-auth-001' },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid or expired access token');
  assert.equal(body.requestId, 'contract-auth-001');
});

test('returns a traceable not-found contract for unknown routes', async () => {
  const response = await fetch(`${baseUrl}/api/v1/not-a-real-route`, {
    headers: { 'X-Request-Id': 'contract-not-found-001' },
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.requestId, 'contract-not-found-001');
  assert.match(body.message, /not found/i);
});

test('rejects invalid public admission applications before persistence', async () => {
  const response = await fetch(`${baseUrl}/api/v1/admissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'contract-admission-001' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.requestId, 'contract-admission-001');
});

test('rejects calendar events with an invalid date range before persistence', async () => {
  const response = await fetch(`${baseUrl}/api/v1/calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'contract-calendar-001' },
    body: JSON.stringify({ title: 'Final examination', type: 'EXAM', academicYear: '2026-2027', startDate: '2026-09-10', endDate: '2026-09-09' }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.requestId, 'contract-calendar-001');
});
