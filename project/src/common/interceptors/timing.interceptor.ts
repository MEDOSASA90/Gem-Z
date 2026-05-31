/**
 * =============================================================================
 * TimingInterceptor - تتبع أوقات الطلبات
 * =============================================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface TimingStats {
  route: string;
  method: string;
  durationMs: number;
  statusCode: number;
}

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);
  private readonly slowRequestThresholdMs: number;
  private timings: TimingStats[] = [];

  constructor() {
    this.slowRequestThresholdMs = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const route = request.route?.path || request.url;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = httpContext.getResponse().statusCode;

          this.recordTiming({ route, method, durationMs: duration, statusCode });

          // تحذير إذا كان الطلب بطيء
          if (duration > this.slowRequestThresholdMs) {
            this.logger.warn(
              'Slow request detected: %s %s -> %dms (threshold: %dms)',
              method,
              route,
              duration,
              this.slowRequestThresholdMs,
            );
          }

          // إضافة header بوقت الاستجابة
          httpContext.getResponse().setHeader('X-Response-Time', `${duration}ms`);
        },
        error: (error: { status?: number }) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.recordTiming({ route, method, durationMs: duration, statusCode });
        },
      }),
    );
  }

  /** الحصول على إحصائيات الأداء */
  getStats(): { avgResponseTime: number; slowest: TimingStats | null; totalRequests: number } {
    if (this.timings.length === 0) {
      return { avgResponseTime: 0, slowest: null, totalRequests: 0 };
    }

    const total = this.timings.reduce((sum, t) => sum + t.durationMs, 0);
    const avg = Math.round(total / this.timings.length);
    const slowest = this.timings.reduce((max, t) => (t.durationMs > max.durationMs ? t : max), this.timings[0]);

    return { avgResponseTime: avg, slowest, totalRequests: this.timings.length };
  }

  /** إعادة تعيين الإحصائيات */
  resetStats(): void {
    this.timings = [];
  }

  private recordTiming(stats: TimingStats): void {
    this.timings.push(stats);

    // حفظ آخر 10000 قياس
    if (this.timings.length > 10000) {
      this.timings = this.timings.slice(-5000);
    }
  }
}
