import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { configureCloudinary } from './config/cloudinary';
import { initializeSocket } from './config/socket';
import { closeQueues } from './config/queue';
import { startReportCardWorker } from './jobs/reportCard.job';
import { startNotificationWorker } from './jobs/notification.job';
import { startAnalyticsWorker } from './jobs/analytics.job';
import { schedulePaymentReconciliation, startPaymentReconciliationWorker } from './jobs/paymentReconciliation.job';
import config from './config/env';
import logger from './utils/logger';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

async function bootstrap(): Promise<void> {
  try {
    // Connect services
    await connectDatabase();
    await connectRedis();
    configureCloudinary();

    // Create Express app
    const app = createApp();
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(httpServer);

    // Start background job workers
    startReportCardWorker();
    startNotificationWorker();
    startAnalyticsWorker();
    startPaymentReconciliationWorker();
    await schedulePaymentReconciliation();

    // Start server
    httpServer.listen(config.PORT, () => {
      logger.info(`
        
 Environment : ${config.NODE_ENV.padEnd(25)}
 Port        : ${String(config.PORT).padEnd(25)}
 API Base    : /api/v1                   
      `);
    });

    // ── Graceful Shutdown ───────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');
        await Promise.allSettled([
          disconnectDatabase(),
          disconnectRedis(),
          closeQueues(),
        ]);
        logger.info('All connections closed. Goodbye!');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
