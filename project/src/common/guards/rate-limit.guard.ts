/**
 * =============================================================================
 * RateLimitGuard - حماية Rate Limiting
 * =============================================================================
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../../core/security/rate-limit.service';
import { RateLimitConfig } from '../../core/security/security.types';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator لتعيين إعدادات rate limit على route
 * @example
 * ```typescript
 * @RateLimit({ limit: 10, windowSeconds: 60 })
 * @Get('sensitive')
 * async sensitive() { }
 * ```
 */
export const RateLimit = (config: Omit<RateLimitConfig, 'key'>) => {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, config, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.getRateLimitConfig(context);

    if (!rateLimitConfig) {
      return true; // لا يوجد rate limit محدد
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip || 'anonymous';
    const route = `${request.method}:${request.route?.path || request.url}`;
    const key = `guard:${userId}:${route}`;

    const result = await this.rateLimitService.checkDetailed(
      key,
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds,
    );

    // إضافة headers للاستجابة
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit - result.current));
    response.setHeader('X-RateLimit-Reset', result.resetAfterSeconds);

    if (!result.allowed) {
      this.logger.warn(
        'Rate limit exceeded for user %s on route %s (%d/%d)',
        userId,
        route,
        result.current,
        result.limit,
      );
      throw new HttpException(
        `Rate limit exceeded. Retry after ${result.resetAfterSeconds} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getRateLimitConfig(context: ExecutionContext): { limit: number; windowSeconds: number } | null {
    const handler = context.getHandler();
    const config = Reflect.getMetadata(RATE_LIMIT_KEY, handler);

    if (config) {
      return config as { limit: number; windowSeconds: number };
    }

    // افتراضيات عامة
    return {
      limit: 100,
      windowSeconds: 60,
    };
  }
}
