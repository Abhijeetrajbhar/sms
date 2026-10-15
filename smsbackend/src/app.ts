import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './config/env';
import logger from './utils/logger';
import { defaultRateLimit } from './middlewares/rateLimit.middleware';
import { paymentWebhookRateLimit } from './middlewares/rateLimit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';
import { requestContext } from './middlewares/requestContext.middleware';
import { RequestWithContext } from './middlewares/requestContext.middleware';
import { getReadiness } from './utils/health';

// Route imports
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/user/routes';
import studentRoutes from './modules/student/routes';
import teacherRoutes from './modules/teacher/routes';
import parentRoutes from './modules/parent/routes';
import classRoutes from './modules/class/routes';
import subjectRoutes from './modules/subject/routes';
import attendanceRoutes from './modules/attendance/routes';
import assignmentRoutes from './modules/assignment/routes';
import resultRoutes from './modules/result/routes';
import reportCardRoutes from './modules/reportCard/routes';
import notificationRoutes from './modules/notification/routes';
import analyticsRoutes from './modules/analytics/routes';
import timetableRoutes from './modules/timetable/routes';
import feeRoutes from './modules/fee/routes';
import announcementRoutes from './modules/announcement/routes';
import auditLogRoutes from './modules/auditLog/routes';
import aiRoutes from './modules/ai/ai.routes';
import paymentRoutes from './modules/payment/routes';
import paymentWebhookRoutes from './modules/payment/webhook.routes';
import receiptRoutes from './modules/receipt/routes';
import refundRoutes from './modules/refund/routes';
import admissionRoutes from './modules/admission/routes';
import calendarRoutes from './modules/calendar/routes';
import documentRoutes from './modules/document/routes';
import leaveRoutes from './modules/leave/routes';
import standardCheckoutRoutes from './modules/payment/standardCheckout.routes';

export function createApp(): Application {
  const app = express();

  // Production platforms commonly terminate TLS at a single reverse proxy.
  // Trust exactly that hop so secure cookies and client IP-based rate limits
  // work correctly without accepting arbitrary forwarded headers.
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(requestContext);

  // ── Security ─────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        const configuredOrigins = config.CLIENT_URL.split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const allowed = config.NODE_ENV === 'production'
          ? configuredOrigins
          : [
              ...configuredOrigins,
              'http://localhost:3000',
              'http://localhost:5173',
              'http://127.0.0.1:3000',
              'http://127.0.0.1:5173',
            ];
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Idempotency-Key',
        'X-Razorpay-Signature',
        'X-Razorpay-Event-Id',
      ],
    })
  );

  // Razorpay signs the exact raw request bytes, so this must run before express.json().
  app.use(
    '/api/v1/payments/webhook',
    paymentWebhookRateLimit,
    express.raw({ type: 'application/json', limit: '1mb' }),
    paymentWebhookRoutes
  );

  // ── Core Middleware ───────────────────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Logging ───────────────────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    morgan.token('request-id', (req) => (req as RequestWithContext).requestId || '-');
    app.use(
      morgan(':request-id :remote-addr :method :url :status :res[content-length] - :response-time ms', {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.url === '/health',
      })
    );
  }

  // ── Global Rate Limit ─────────────────────────────────────────────────────────
  app.use(defaultRateLimit);

  // ── Health Check ──────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'EduManage API is running',
      env: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Liveness is intentionally dependency-free; readiness verifies downstream services.
  app.get('/health/live', (_req, res) => {
    res.json({ success: true, status: 'live', timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', async (_req, res, next) => {
    try {
      const readiness = await getReadiness();
      res.status(readiness.ready ? 200 : 503).json({
        success: readiness.ready,
        status: readiness.ready ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        ...readiness,
      });
    } catch (error) {
      next(error);
    }
  });

  // ── API Routes ────────────────────────────────────────────────────────────────
  const API = '/api/v1';

  app.use(`${API}/auth`, authRoutes);
  app.use(`${API}/users`, userRoutes);
  app.use(`${API}/students`, studentRoutes);
  app.use(`${API}/teachers`, teacherRoutes);
  app.use(`${API}/parents`, parentRoutes);
  app.use(`${API}/classes`, classRoutes);
  app.use(`${API}/subjects`, subjectRoutes);
  app.use(`${API}/attendance`, attendanceRoutes);
  app.use(`${API}/assignments`, assignmentRoutes);
  app.use(`${API}/results`, resultRoutes);
  app.use(`${API}/report-cards`, reportCardRoutes);
  app.use(`${API}/notifications`, notificationRoutes);
  app.use(`${API}/analytics`, analyticsRoutes);
  app.use(`${API}/timetable`, timetableRoutes);
  app.use(`${API}/fees`, feeRoutes);
  app.use(`${API}/announcements`, announcementRoutes);
  app.use(`${API}/audit-logs`, auditLogRoutes);
  app.use(`${API}/ai`, aiRoutes);
  app.use(`${API}/payments`, paymentRoutes);
  app.use(`${API}/receipts`, receiptRoutes);
  app.use(`${API}/refunds`, refundRoutes);
  app.use(`${API}/admissions`, admissionRoutes);
  app.use(`${API}/calendar`, calendarRoutes);
  app.use(`${API}/documents`, documentRoutes);
  app.use(`${API}/leaves`, leaveRoutes);

  // ── Razorpay Standard Checkout Routes ─────────────────────────────────────────
  app.use('/api', standardCheckoutRoutes);
  app.use(API, standardCheckoutRoutes);
  app.use(`${API}/payments/standard`, standardCheckoutRoutes);

  // ── Error Handlers ────────────────────────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
