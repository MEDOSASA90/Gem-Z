/**
 * =============================================================================
 * RateLimitService - خدمة Rate Limiting الموزعة
 * =============================================================================
 * تستخدم Redis للـ distributed rate limiting
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { RateLimitResult, RateLimitConfig } from './security.types';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** تهيئة الاتصال بـ Redis */
  async onModuleInit(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redisDb = this.configService.get<number>('REDIS_RATE_LIMIT_DB', 2);

      const redisOptions: RedisOptions = {
        host: redisHost,
        port: redisPort,
        db: redisDb,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
      };

      if (redisPassword) {
        redisOptions.password = redisPassword;
      }

      this.redis = new Redis(redisOptions);

      this.redis.on('error', (err) => {
        this.logger.error('Redis RateLimit Error: %s', err.message);
      });

      this.logger.log('RateLimitService initialized - Redis connected');
    } catch (error) {
      this.logger.error('Failed to initialize RateLimitService: %s', (error as Error).message);
    }
  }

  /** إيقاف الخدمة */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * فحص ما إذا كان الطلب مسموحاً
   * @param key - المفتاح الفريد (مثال: "rate_limit:login:user_123")
   * @param limit - الحد الأقصى للطلبات
   * @param windowSeconds - النافذة الزمنية بالثواني
   */
  async check(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const result = await this.checkDetailed(key, limit, windowSeconds);
    return result.allowed;
  }

  /**
   * فحص مفصل مع معلومات إضافية
   */
  async checkDetailed(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      if (!this.redis) {
        // Fallback: allow if Redis is not available
        this.logger.warn('Redis not available, allowing request');
        return { allowed: true, current: 0, limit, resetAfterSeconds: windowSeconds, blocked: false };
      }

      const redisKey = `ratelimit:${key}`;
      const blockKey = `ratelimit:block:${key}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % windowSeconds);

      // التحقق مما إذا كان المفتاح محظوراً
      const isBlocked = await this.redis.exists(blockKey);
      if (isBlocked) {
        const ttl = await this.redis.ttl(blockKey);
        return {
          allowed: false,
          current: limit,
          limit,
          resetAfterSeconds: Math.max(ttl, 0),
          blocked: true,
          blockedUntil: new Date(Date.now() + Math.max(ttl, 0) * 1000).toISOString(),
        };
      }

      // استخدام Redis pipeline لأداء أفضل
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, windowSeconds);
      const results = await pipeline.exec();

      const currentCount = (results?.[0]?.[1] as number) || 1;

      if (currentCount > limit) {
        // حظر مؤقت
        const blockDuration = windowSeconds * 2;
        await this.redis.setex(blockKey, blockDuration, '1');

        this.logger.warn('Rate limit exceeded for key %s: %d/%d', key, currentCount, limit);

        return {
          allowed: false,
          current: currentCount,
          limit,
          resetAfterSeconds: blockDuration,
          blocked: true,
          blockedUntil: new Date(Date.now() + blockDuration * 1000).toISOString(),
        };
      }

      return {
        allowed: true,
        current: currentCount,
        limit,
        resetAfterSeconds: windowSeconds - (now - windowStart),
        blocked: false,
      };
    } catch (error) {
      this.logger.error('Rate limit check failed: %s', (error as Error).message);
      // Fallback: allow on error
      return { allowed: true, current: 0, limit, resetAfterSeconds: windowSeconds, blocked: false };
    }
  }

  /**
   * زيادة العداد بدون فحص
   */
  async increment(key: string, windowSeconds: number): Promise<number> {
    try {
      if (!this.redis) return 0;

      const redisKey = `ratelimit:${key}`;
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, windowSeconds);
      const results = await pipeline.exec();

      return (results?.[0]?.[1] as number) || 0;
    } catch (error) {
      this.logger.error('Rate limit increment failed: %s', (error as Error).message);
      return 0;
    }
  }

  /**
   * إعادة تعيين العداد
   */
  async reset(key: string): Promise<void> {
    try {
      if (!this.redis) return;

      const redisKey = `ratelimit:${key}`;
      const blockKey = `ratelimit:block:${key}`;
      await this.redis.del(redisKey, blockKey);

      this.logger.debug('Rate limit reset for key %s', key);
    } catch (error) {
      this.logger.error('Rate limit reset failed: %s', (error as Error).message);
    }
  }

  /**
   * فحص rate limit باستخدام Config object
   */
  async checkWithConfig(config: RateLimitConfig): Promise<RateLimitResult> {
    return this.checkDetailed(config.key, config.limit, config.windowSeconds);
  }

  /**
   * الحصول على حالة rate limit (بدون زيادة)
   */
  async getStatus(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      if (!this.redis) {
        return { allowed: true, current: 0, limit, resetAfterSeconds: windowSeconds, blocked: false };
      }

      const redisKey = `ratelimit:${key}`;
      const blockKey = `ratelimit:block:${key}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % windowSeconds);

      const [currentCount, isBlocked] = await Promise.all([
        this.redis.get(redisKey).then((v) => parseInt(v || '0', 10)),
        this.redis.exists(blockKey),
      ]);

      if (isBlocked) {
        const ttl = await this.redis.ttl(blockKey);
        return {
          allowed: false,
          current: currentCount,
          limit,
          resetAfterSeconds: Math.max(ttl, 0),
          blocked: true,
        };
      }

      return {
        allowed: currentCount < limit,
        current: currentCount,
        limit,
        resetAfterSeconds: windowSeconds - (now - windowStart),
        blocked: false,
      };
    } catch (error) {
      this.logger.error('Rate limit status check failed: %s', (error as Error).message);
      return { allowed: true, current: 0, limit, resetAfterSeconds: windowSeconds, blocked: false };
    }
  }
}
