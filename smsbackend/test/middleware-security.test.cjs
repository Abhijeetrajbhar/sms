const test = require('node:test');
const assert = require('node:assert/strict');
const { Role } = require('@prisma/client');

// Import middlewares
const { authorize } = require('../dist/middlewares/role.middleware.js');
const {
  isSuperAdmin,
  hasAdminPermission,
  requireAdminPermission,
  requireSuperAdmin,
} = require('../dist/middlewares/adminPermission.middleware.js');
const { errorMiddleware, notFoundMiddleware } = require('../dist/middlewares/error.middleware.js');
const { AppError } = require('../dist/utils/AppError.js');

test('Role Middleware: authorizes allowed roles and rejects unauthorized ones with 401/403', () => {
  const teacherOrAdminMiddleware = authorize(Role.ADMIN, Role.TEACHER);

  // 1. Missing user on request -> 401 Unauthorized
  let calledError = null;
  teacherOrAdminMiddleware({}, {}, (err) => { calledError = err; });
  assert.ok(calledError instanceof AppError);
  assert.equal(calledError.statusCode, 401);

  // 2. Student attempting teacher/admin route -> 403 Forbidden
  calledError = null;
  teacherOrAdminMiddleware({ user: { role: Role.STUDENT } }, {}, (err) => { calledError = err; });
  assert.ok(calledError instanceof AppError);
  assert.equal(calledError.statusCode, 403);
  assert.match(calledError.message, /Access denied/);

  // 3. Parent attempting teacher/admin route -> 403 Forbidden
  calledError = null;
  teacherOrAdminMiddleware({ user: { role: Role.PARENT } }, {}, (err) => { calledError = err; });
  assert.ok(calledError instanceof AppError);
  assert.equal(calledError.statusCode, 403);

  // 4. Admin allowed -> next() called without error
  let nextCalled = false;
  teacherOrAdminMiddleware({ user: { role: Role.ADMIN } }, {}, (err) => {
    assert.equal(err, undefined);
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  // 5. Teacher allowed -> next() called without error
  nextCalled = false;
  teacherOrAdminMiddleware({ user: { role: Role.TEACHER } }, {}, (err) => {
    assert.equal(err, undefined);
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test('Admin Permission Middleware: fine-grained permission control and super-admin bypass', () => {
  const normalAdmin = {
    role: 'ADMIN',
    isSuperAdmin: false,
    permissions: ['results:publish', 'fees:view'],
  };
  const superAdmin = {
    role: 'ADMIN',
    isSuperAdmin: true,
    permissions: [],
  };
  const restrictedAdmin = {
    role: 'ADMIN',
    isSuperAdmin: false,
    permissions: ['users:view'],
  };

  assert.equal(isSuperAdmin(superAdmin), true);
  assert.equal(isSuperAdmin(normalAdmin), false);

  // Normal admin has specific permission
  assert.equal(hasAdminPermission(normalAdmin, 'results:publish'), true);
  assert.equal(hasAdminPermission(normalAdmin, 'users:delete'), false);

  // Super admin bypasses all permission checks
  assert.equal(hasAdminPermission(superAdmin, 'results:publish'), true);
  assert.equal(hasAdminPermission(superAdmin, 'users:delete'), true);
  assert.equal(hasAdminPermission(superAdmin, 'audit:view'), true);

  // requireAdminPermission middleware check
  const publishMiddleware = requireAdminPermission('results:publish');

  // Allowed for normalAdmin with permission
  let nextInvoked = false;
  publishMiddleware({ user: normalAdmin }, {}, (err) => {
    assert.equal(err, undefined);
    nextInvoked = true;
  });
  assert.equal(nextInvoked, true);

  // Allowed for superAdmin
  nextInvoked = false;
  publishMiddleware({ user: superAdmin }, {}, (err) => {
    assert.equal(err, undefined);
    nextInvoked = true;
  });
  assert.equal(nextInvoked, true);

  // Denied (403) for restrictedAdmin lacking results:publish
  let deniedErr = null;
  publishMiddleware({ user: restrictedAdmin }, {}, (err) => {
    deniedErr = err;
  });
  assert.ok(deniedErr instanceof AppError);
  assert.equal(deniedErr.statusCode, 403);
  assert.match(deniedErr.message, /Missing admin permission: results:publish/);

  // requireSuperAdmin middleware
  let superErr = null;
  requireSuperAdmin({ user: normalAdmin }, {}, (err) => { superErr = err; });
  assert.ok(superErr instanceof AppError);
  assert.equal(superErr.statusCode, 403);
  assert.match(superErr.message, /Super admin access required/);

  let superOk = false;
  requireSuperAdmin({ user: superAdmin }, {}, (err) => {
    assert.equal(err, undefined);
    superOk = true;
  });
  assert.equal(superOk, true);
});

test('Error Middleware: formats AppError, Prisma violations, and assigns requestId', () => {
  const mockReq = {
    url: '/api/v1/test',
    method: 'POST',
    requestId: 'req-test-9999',
  };

  let capturedStatus = 0;
  let capturedJson = null;

  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(body) {
      capturedJson = body;
      return this;
    },
  };

  // Operational AppError test
  const appErr = AppError.conflict('Invoice already settled');
  errorMiddleware(appErr, mockReq, mockRes, () => {});

  assert.equal(capturedStatus, 409);
  assert.equal(capturedJson.success, false);
  assert.equal(capturedJson.message, 'Invoice already settled');
  assert.equal(capturedJson.requestId, 'req-test-9999');

  // Prisma unique violation simulation
  const prismaP2002 = new (class PrismaClientKnownRequestError extends Error {
    constructor() {
      super('Unique constraint');
      this.code = 'P2002';
      this.meta = { target: ['email'] };
    }
  })();
  errorMiddleware(prismaP2002, mockReq, mockRes, () => {});

  assert.equal(capturedStatus, 409);
  assert.match(capturedJson.message, /A record with this email already exists/);

  // Not Found Middleware test
  let notFoundErr = null;
  notFoundMiddleware({ originalUrl: '/api/v1/unknown-endpoint' }, {}, (err) => {
    notFoundErr = err;
  });
  assert.ok(notFoundErr instanceof AppError);
  assert.equal(notFoundErr.statusCode, 404);
  assert.match(notFoundErr.message, /Route \/api\/v1\/unknown-endpoint not found/);
});

