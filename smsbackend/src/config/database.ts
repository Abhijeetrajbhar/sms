import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (!globalForPrisma.prisma) {
  prisma.$use(async (params, next) => {
    if (params.args?.where?.deletedAt === null) {
      params.args.where.deletedAt = undefined;
      params.args.where.OR = [
        ...(params.args.where.OR || []),
        { deletedAt: null },
        { deletedAt: { isSet: false } },
      ];
    }
    return next(params);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info(' MongoDB connected via Prisma');
  } catch (error) {
    logger.error(' Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('MongoDB disconnected');
}

export default prisma;
