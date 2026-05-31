/**
 * =============================================================================
 * LoggingInterceptor - تسجيل الطلبات والاستجابات
 * =============================================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;
          this.logger.log(
            '%s %s %d - %dms - %s - %s',
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent,
          );
        },
        error: (error: { status?: number; message?: string }) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.logger.error(
            '%s %s %d - %dms - %s - Error: %s',
            method,
            url,
            statusCode,
            duration,
            ip,
            error.message || 'Unknown error',
          );
        },
      }),
    );
  }
}
