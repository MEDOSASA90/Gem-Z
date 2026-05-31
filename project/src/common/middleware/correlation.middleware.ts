/**
 * =============================================================================
 * CorrelationMiddleware - Middleware إدارة Correlation ID
 * =============================================================================
 * يضمن تتبع الطلب عبر الخدمات المختلفة باستخدام correlation ID واحد
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestId: string;
    }
  }
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // استخراج correlation id من الـ header أو توليد واحد جديد
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();

    // توليد request id فريد لهذا الطلب
    const requestId = randomUUID();

    // إرفاق بالـ request
    req.correlationId = correlationId;
    req.requestId = requestId;

    // إضافة للـ response headers
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);

    next();
  }
}
