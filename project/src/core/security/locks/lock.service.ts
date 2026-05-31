import { Injectable, Logger, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private redisClient: Redis;

  constructor() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    const db = parseInt(process.env.REDIS_DB ?? '0', 10);

    this.redisClient = new Redis({
      host,
      port,
      db,
      password,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  }

  /**
   * Acquire a lock
   */
  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const result = await this.redisClient.set(
      `lock:${key}`,
      '1',
      'PX',
      ttlMs,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release a lock
   */
  async release(key: string): Promise<void> {
    await this.redisClient.del(`lock:${key}`);
  }

  /**
   * Run an operation wrapped in a distributed lock with auto-retry
   */
  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    ttlMs: number = 30000,
  ): Promise<T> {
    const startTime = Date.now();
    let acquired = false;

    while (!acquired && Date.now() - startTime < timeoutMs) {
      acquired = await this.acquire(key, ttlMs);
      if (!acquired) {
        // Wait 100ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (!acquired) {
      throw new ConflictException(
        `Unable to acquire distributed lock for resource: ${key}. Process busy.`,
      );
    }

    try {
      return await operation();
    } finally {
      await this.release(key);
    }
  }
}
