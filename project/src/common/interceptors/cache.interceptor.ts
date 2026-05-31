/**
 * =============================================================================
 * CacheInterceptor - التخزين المؤقت باستخدام Redis
 * =============================================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private redis: Redis | null = null;
  private readonly defaultTtl: number;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = this.configService.get<number>('CACHE_TTL_SECONDS', 300);
    this.enabled = this.configService.get<boolean>('CACHE_ENABLED', true);
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redisDb = this.configService.get<number>('REDIS_CACHE_DB', 3);

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        db: redisDb,
        password: redisPassword || undefined,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 2,
      });
    } catch (error) {
      this.logger.error('Cache Redis connection failed: %s', (error as Error).message);
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (!this.enabled || !this.redis) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    try {
      // محاولة قراءة من الـ cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit: %s', cacheKey);
        return of(JSON.parse(cached));
      }
    } catch (error) {
      this.logger.error('Cache read error: %s', (error as Error).message);
    }

    // تنفيذ الـ handler وتخزين النتيجة
    return next.handle().pipe(
      tap(async (data) => {
        try {
          const serialized = JSON.stringify(data);
          await this.redis!.setex(cacheKey, this.defaultTtl, serialized);
          this.logger.debug('Cache stored: %s (TTL: %ds)', cacheKey, this.defaultTtl);
        } catch (error) {
          this.logger.error('Cache write error: %s', (error as Error).message);
        }
      }),
    );
  }

  private generateCacheKey(request: { method: string; url: string; user?: { id: string } }): string {
    const userId = request.user?.id || 'anonymous';
    const route = `${request.method}:${request.url}`;
    return `cache:${userId}:${route}`;
  }
}
