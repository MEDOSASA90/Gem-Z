/**
 * =============================================================================
 * LoggerMiddleware - Middleware تسجيل الطلبات
 * =============================================================================
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // تسجيل عند بدء الطلب
    this.logger.log('>> %s %s - %s - %s', method, url, ip, userAgent);

    // استمع لانتهاء الـ response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const contentLength = res.get('content-length') || 0;

      const logFn = statusCode >= 500 
        ? this.logger.error.bind(this.logger)
        : statusCode >= 400 
          ? this.logger.warn.bind(this.logger)
          : this.logger.log.bind(this.logger);

      logFn('<< %s %s %d - %dms - %sB - %s', method, url, statusCode, duration, contentLength, ip);
    });

    next();
  }
}
