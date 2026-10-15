import Redis from 'ioredis';
import config from './env';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    const options: Record<string, unknown> = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy: null,
    };

    if (config.REDIS_PASSWORD) {
      options.password = config.REDIS_PASSWORD;
    }

    redisClient = new Redis(config.REDIS_URL, options);

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('close', () => logger.warn('Redis connection closed'));

    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis connection failed — caching disabled:', error);
    redisClient?.disconnect();
    redisClient = null;
  }
}

interface CacheItem {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheItem>();

export async function cacheGet(key: string): Promise<string | null> {
  if (redisClient) {
    try {
      return await redisClient.get(key);
    } catch {
      // Fall through to in-memory store
    }
  }
  const item = memoryStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, value);
      return;
    } catch {
      // Fall through to in-memory store
    }
  }
  if (memoryStore.size > 500) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey) memoryStore.delete(oldestKey);
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch {
      // Fall through
    }
  }
  memoryStore.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Fall through
    }
  }
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const k of memoryStore.keys()) {
    if (regex.test(k)) {
      memoryStore.delete(k);
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis disconnected');
  }
}
