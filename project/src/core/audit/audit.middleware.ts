/**
 * =============================================================================
 * AuditMiddleware - Middleware تلقائي لتسجيل HTTP Requests
 * =============================================================================
 * يسجل كل الطلبات HTTP تلقائياً في نظام التدقيق
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export interface RequestWithAudit extends Request {
  auditContext?: {
    actorId: string;
    actorType: string;
    correlationId: string;
  };
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);
  private readonly sensitiveFields = [
    'password',
    'token',
    'secret',
    'credit_card',
    'cvv',
    'pin',
    'authorization',
    'cookie',
  ];

  constructor(private readonly auditService: AuditService) {}

  async use(req: RequestWithAudit, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || this.generateId();

    // إرفاق correlation id بالـ response
    res.setHeader('x-correlation-id', correlationId);

    // تسجيل الـ request
    await this.logRequest(req, correlationId);

    // استمع لحدث إنهاء الـ response
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      await this.logResponse(req, res, correlationId, duration);
    });

    next();
  }

  /** تسجيل الـ Request */
  private async logRequest(req: RequestWithAudit, correlationId: string): Promise<void> {
    try {
      const actorId = this.extractActorId(req);
      const method = req.method;
      const path = req.path;
      const ip = this.extractIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      // ت sanitize البيانات الحساسة
      const sanitizedBody = this.sanitizeBody(req.body);

      await this.auditService.log({
        action: `HTTP_${method}`,
        actor: { id: actorId, type: 'USER' },
        resource: {
          type: 'HTTP_ENDPOINT',
          id: `${method} ${path}`,
        },
        ip_address: ip,
        user_agent: userAgent,
        correlation_id: correlationId,
        metadata: {
          endpoint: path,
          method,
          module: this.extractModule(path),
          description: `HTTP ${method} ${path}`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log request: %s', (error as Error).message);
    }
  }

  /** تسجيل الـ Response */
  private async logResponse(
    req: RequestWithAudit,
    res: Response,
    correlationId: string,
    durationMs: number,
  ): Promise<void> {
    try {
      const actorId = this.extractActorId(req);
      const statusCode = res.statusCode;
      const isError = statusCode >= 400;

      // تسجيل الأخطاء فقط أو الطلبات المهمة
      if (isError || ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const riskScore = this.calculateRiskScore(statusCode, req);

        await this.auditService.log({
          action: isError ? `HTTP_ERROR_${statusCode}` : `HTTP_${req.method}_COMPLETED`,
          actor: { id: actorId, type: 'USER' },
          resource: {
            type: 'HTTP_RESPONSE',
            id: `${req.method} ${req.path}`,
          },
          ip_address: this.extractIp(req),
          user_agent: req.headers['user-agent'] || 'unknown',
          risk_score: riskScore,
          correlation_id: correlationId,
          metadata: {
            endpoint: req.path,
            method: req.method,
            module: this.extractModule(req.path),
            description: `HTTP ${req.method} ${req.path} -> ${statusCode} (${durationMs}ms)`,
            tags: isError ? ['error', 'http'] : ['http'],
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to log response: %s', (error as Error).message);
    }
  }

  /** استخراج معرف المستخدم من الـ Request */
  private extractActorId(req: RequestWithAudit): string {
    // من الـ JWT token decoded (موضوع في req by auth guard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (user?.id || user?.sub) {
      return user.id || user.sub;
    }

    // من الـ header
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `api:${apiKey.substring(0, 8)}`;
    }

    // system
    return 'anonymous';
  }

  /** استخراج IP address */
  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }

  /** استخراج اسم الموديول من المسار */
  private extractModule(path: string): string {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'api') {
      return parts[1] || 'unknown';
    }
    return parts[0] || 'unknown';
  }

  /** إزالة البيانات الحساسة من الـ body */
  private sanitizeBody(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (this.sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /** حساب درجة الخطورة */
  private calculateRiskScore(statusCode: number, req: Request): number {
    let score = 0;

    // خطأ HTTP
    if (statusCode >= 500) score += 30;
    else if (statusCode === 403) score += 40;
    else if (statusCode === 401) score += 25;

    // عمليات خطرة
    if (['DELETE'].includes(req.method)) score += 10;
    if (req.path.includes('/admin/')) score += 15;

    return Math.min(score, 100);
  }

  /** توليد معرف فريد */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
