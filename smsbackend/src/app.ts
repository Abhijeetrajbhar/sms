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

export function createApp(): Application {
  const app = express();

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
        const allowed = [config.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'];
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
    app.use(
      morgan('combined', {
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

  // ── Error Handlers ────────────────────────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
