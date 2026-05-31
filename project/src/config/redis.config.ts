/**
 * ============================================================
 * GEM Z - Redis Configuration
 * Cache, Sessions, Pub/Sub, Distributed Locks
 * ============================================================
 * - Connection URL من متغيرات البيئة
 * - Retry strategy مع exponential backoff
 * - Max retries per request
 * - Enable ready check
 * ============================================================
 */

import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

const logger = new Logger('RedisConfig');

/**
 * خيارات اتصال Redis
 */
export interface RedisConfig {
  url: string;
  retryStrategy: (times: number) => number;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
}

/**
 * الحصول على إعدادات Redis
 */
export function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  return {
    url: redisUrl,

    // ─── Retry Strategy ───
    retryStrategy: (times: number): number => {
      // Exponential backoff: max 30 seconds
      const delay = Math.min(times * 100, 30000);
      logger.warn(
        `⚠️ Redis connection retry #${times}, retrying in ${delay}ms...`,
      );
      return delay;
    },

    // ─── Max Retries ───
    maxRetriesPerRequest: 3,

    // ─── Ready Check ───
    enableReadyCheck: true,

    // ─── Lazy Connect ───
    lazyConnect: true,
  };
}

/**
 * إنشاء instance من Redis client
 * @returns Redis instance
 */
export function createRedisClient(): Redis {
  const config = getRedisConfig();

  const redis = new Redis(config.url, {
    retryStrategy: config.retryStrategy,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: config.lazyConnect,
  });

  // ─── Event Listeners ───
  redis.on('connect', () => {
    logger.log('🔌 Redis client connected');
  });

  redis.on('ready', () => {
    logger.log('✅ Redis client ready');
  });

  redis.on('error', (err) => {
    logger.error('❌ Redis client error:', err.message);
  });

  redis.on('reconnecting', () => {
    logger.warn('🔄 Redis client reconnecting...');
  });

  redis.on('end', () => {
    logger.warn('🔴 Redis client connection closed');
  });

  return redis;
}

/**
 * إنشاء Redis Pub/Sub clients للـ Event Bus
 */
export function createPubSubClients(): { publisher: Redis; subscriber: Redis } {
  const config = getRedisConfig();

  const publisher = new Redis(config.url, {
    retryStrategy: config.retryStrategy,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    lazyConnect: true,
  });

  const subscriber = new Redis(config.url, {
    retryStrategy: config.retryStrategy,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    lazyConnect: true,
  });

  return { publisher, subscriber };
}
