import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import config from './env';
import { verifyAccessToken } from '../utils/jwt';
import logger from '../utils/logger';
import prisma from './database';

let io: SocketServer;

export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for socket
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, status: true, deletedAt: true },
      });
      if (!user || user.deletedAt || user.status !== 'ACTIVE') {
        return next(new Error('Account is not active'));
      }
      (socket as Socket & { userId: string; role: string }).userId = user.id;
      (socket as Socket & { userId: string; role: string }).role = user.role;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    logger.info(`Socket connected: ${socket.id} for user ${userId}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
