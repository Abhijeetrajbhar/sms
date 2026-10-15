import { prisma } from '../config/database';
import { getRedisClient } from '../config/redis';

export type DependencyHealth = {
  status: 'ok' | 'disabled' | 'error';
  latencyMs?: number;
};

function withTimeout<T>(operation: Promise<T>, timeoutMs = 3000): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error('Timed out')), timeoutMs)),
  ]);
}

async function checkDatabase(): Promise<DependencyHealth> {
  const startedAt = Date.now();
  try {
    await withTimeout(prisma.$runCommandRaw({ ping: 1 }));
    return { status: 'ok', latencyMs: Date.now() - startedAt };
  } catch {
    return { status: 'error', latencyMs: Date.now() - startedAt };
  }
}

async function checkRedis(): Promise<DependencyHealth> {
  const client = getRedisClient();
  if (!client) return { status: 'disabled' };

  const startedAt = Date.now();
  try {
    await withTimeout(client.ping());
    return { status: 'ok', latencyMs: Date.now() - startedAt };
  } catch {
    return { status: 'error', latencyMs: Date.now() - startedAt };
  }
}

export async function getReadiness(): Promise<{ ready: boolean; dependencies: Record<string, DependencyHealth> }> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  return {
    ready: database.status === 'ok' && redis.status !== 'error',
    dependencies: { database, redis },
  };
}
