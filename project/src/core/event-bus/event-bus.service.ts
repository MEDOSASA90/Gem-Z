/**
 * =============================================================================
 * EventBusService - خدمة الأحداث المركزية باستخدام Redis Pub/Sub
 * =============================================================================
 * توفر آلية نشر واشتراك موزعة عبر Redis للتواصل بين الموديولات
 */

import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  EventEnvelope,
  EventHandler,
  EventType,
  PublishResult,
  SubscribeOptions,
  EventBusStats,
} from './event.types';

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private stats: EventBusStats = {
    totalPublished: 0,
    totalSubscribed: 0,
    activeSubscriptions: 0,
    failedDeliveries: 0,
    avgProcessingTimeMs: 0,
  };
  private processingTimes: number[] = [];

  constructor(private readonly configService: ConfigService) {}

  /** تهيئة الاتصال بـ Redis عند بدء الموديول */
  async onModuleInit(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redisDb = this.configService.get<number>('REDIS_DB', 0);

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

      // إنشاء اتصالين منفصلين: واحد للنشر وواحد للاشتراك
      this.publisher = new Redis(redisOptions);
      this.subscriber = new Redis(redisOptions);

      this.publisher.on('error', (err) => {
        this.logger.error('Redis Publisher Error: %s', err.message);
      });

      this.subscriber.on('error', (err) => {
        this.logger.error('Redis Subscriber Error: %s', err.message);
      });

      this.subscriber.on('message', async (channel: string, message: string) => {
        await this.handleIncomingMessage(channel, message);
      });

      this.logger.log('EventBusService initialized - Redis Pub/Sub connected');
    } catch (error) {
      this.logger.error('Failed to initialize EventBusService: %s', (error as Error).message);
      throw error;
    }
  }

  /** إغلاق الاتصالات عند إيقاف الموديول */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down EventBusService...');
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
    this.handlers.clear();
    this.logger.log('EventBusService shut down complete');
  }

  /**
   * نشر حدث إلى الـ Event Bus
   * @param envelope - الـ EventEnvelope المراد نشره
   */
  async publish<T>(envelope: EventEnvelope<T>): Promise<PublishResult> {
    try {
      if (!this.publisher) {
        throw new Error('Publisher not initialized');
      }

      const channel = `events:${envelope.event_type}`;
      const message = JSON.stringify(envelope);

      // نشر الرسالة على قناة Redis
      const subscribersCount = await this.publisher.publish(channel, message);

      this.stats.totalPublished++;

      this.logger.debug(
        'Published event [%s] to channel [%s] - %d subscriber(s)',
        envelope.event_id,
        channel,
        subscribersCount,
      );

      return {
        success: true,
        eventId: envelope.event_id,
        publishedAt: new Date().toISOString(),
        subscribersCount,
      };
    } catch (error) {
      this.logger.error(
        'Failed to publish event [%s]: %s',
        envelope.event_id,
        (error as Error).message,
      );
      this.stats.failedDeliveries++;
      throw error;
    }
  }

  /**
   * نشر حدث مبسط - ينشئ الـ envelope تلقائياً
   */
  async publishSimple<T>(
    eventType: EventType,
    payload: T,
    actorId: string,
    sourceModule: string,
    correlationId?: string,
  ): Promise<PublishResult> {
    const envelope: EventEnvelope<T> = {
      event_id: uuidv4(),
      event_type: eventType,
      correlation_id: correlationId || uuidv4(),
      actor_id: actorId,
      source_module: sourceModule,
      timestamp: new Date().toISOString(),
      device_metadata: {
        fingerprint: 'system',
        userAgent: 'system',
        ip: '127.0.0.1',
        geo: { country: 'EG', city: 'Cairo', lat: 30.0444, lon: 31.2357 },
      },
      fraud_metadata: {
        score: 0,
        signals: [],
        action: 'ALLOW',
      },
      payload,
    };

    return this.publish(envelope);
  }

  /**
   * الاشتراك في أحداث بناءً على pattern
   * @param pattern - pattern الاشتراك (مثال: "events:USER_*")
   * @param handler - دالة المعالجة
   */
  subscribe<T>(pattern: string, handler: EventHandler<T>): void {
    if (!this.subscriber) {
      throw new Error('Subscriber not initialized');
    }

    // تسجيل الـ handler
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Set());
    }
    this.handlers.get(pattern)!.add(handler as EventHandler);

    // الاشتراك في قناة Redis
    this.subscriber.subscribe(pattern, (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to [%s]: %s', pattern, err.message);
      } else {
        this.logger.log('Subscribed to channel [%s]', pattern);
      }
    });

    this.stats.totalSubscribed++;
    this.stats.activeSubscriptions = this.handlers.size;
  }

  /**
   * الاشتراك مع خيارات متقدمة
   */
  subscribeWithOptions<T>(options: SubscribeOptions, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = async (envelope) => {
      const startTime = Date.now();
      let lastError: Error | null = null;
      const maxRetries = options.maxRetries ?? 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const timeoutMs = options.timeout ?? 30000;
          await this.withTimeout(handler(envelope), timeoutMs);

          const elapsed = Date.now() - startTime;
          this.recordProcessingTime(elapsed);
          return;
        } catch (error) {
          lastError = error as Error;
          this.logger.warn(
            'Handler failed for [%s] (attempt %d/%d): %s',
            options.pattern,
            attempt + 1,
            maxRetries + 1,
            (error as Error).message,
          );

          if (attempt < maxRetries && options.retryDelay) {
            await this.delay(options.retryDelay * (attempt + 1));
          }
        }
      }

      this.stats.failedDeliveries++;
      this.logger.error(
        'Handler permanently failed for [%s]: %s. Routing to DLQ...',
        options.pattern,
        lastError?.message,
      );

      // Route to Redis DLQ
      try {
        if (this.publisher) {
          const dlqPayload = {
            failedAt: new Date().toISOString(),
            pattern: options.pattern,
            error: lastError?.message || 'Unknown error',
            stack: lastError?.stack || '',
            envelope,
          };
          await this.publisher.rpush('dlq:failed_events', JSON.stringify(dlqPayload));
          this.logger.log(`Event [${envelope.event_id}] successfully routed to Redis DLQ.`);
        }
      } catch (dlqErr) {
        this.logger.error(`Failed to route event [${envelope.event_id}] to DLQ: ${(dlqErr as Error).message}`);
      }
    };

    this.subscribe(options.pattern, wrappedHandler);
  }

  /**
   * إلغاء الاشتراك من أحداث
   */
  unsubscribe(pattern: string): void {
    if (!this.subscriber) return;

    this.handlers.delete(pattern);
    this.subscriber.unsubscribe(pattern, (err) => {
      if (err) {
        this.logger.error('Failed to unsubscribe from [%s]: %s', pattern, err.message);
      } else {
        this.logger.log('Unsubscribed from channel [%s]', pattern);
      }
    });

    this.stats.activeSubscriptions = this.handlers.size;
  }

  /**
   * إلغاء اشتراك handler معين
   */
  unsubscribeHandler(pattern: string, handler: EventHandler): void {
    const patternHandlers = this.handlers.get(pattern);
    if (patternHandlers) {
      patternHandlers.delete(handler);
      if (patternHandlers.size === 0) {
        this.unsubscribe(pattern);
      }
    }
  }

  /** الحصول على إحصائيات الـ Event Bus */
  getStats(): EventBusStats {
    return { ...this.stats };
  }

  /** إعادة تعيين الإحصائيات */
  resetStats(): void {
    this.stats = {
      totalPublished: 0,
      totalSubscribed: 0,
      activeSubscriptions: this.handlers.size,
      failedDeliveries: 0,
      avgProcessingTimeMs: 0,
    };
    this.processingTimes = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /** معالجة الرسائل الواردة من Redis */
  private async handleIncomingMessage(channel: string, message: string): Promise<void> {
    const startTime = Date.now();

    try {
      const envelope = JSON.parse(message) as EventEnvelope;
      const handlers = this.handlers.get(channel);

      if (!handlers || handlers.size === 0) {
        this.logger.warn('No handlers found for channel [%s]', channel);
        return;
      }

      // تنفيذ كل المعالجات بشكل متوازي
      const handlerPromises = Array.from(handlers).map(async (handler) => {
        try {
          await handler(envelope);
        } catch (error) {
          this.logger.error(
            'Handler error for channel [%s]: %s',
            channel,
            (error as Error).message,
          );
        }
      });

      await Promise.all(handlerPromises);

      const elapsed = Date.now() - startTime;
      this.recordProcessingTime(elapsed);
    } catch (error) {
      this.logger.error(
        'Failed to process message on channel [%s]: %s',
        channel,
        (error as Error).message,
      );
      this.stats.failedDeliveries++;
    }
  }

  /** تسجيل وقت المعالجة لحساب المتوسط */
  private recordProcessingTime(ms: number): void {
    this.processingTimes.push(ms);
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-500);
    }
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.stats.avgProcessingTimeMs = Math.round(sum / this.processingTimes.length);
  }

  /** مساعد لإضافة timeout على Promise */
  private withTimeout<T>(promise: Promise<T> | T, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Handler timed out after ${ms}ms`));
      }, ms);

      Promise.resolve(promise)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /** مساعد للتأخير */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
