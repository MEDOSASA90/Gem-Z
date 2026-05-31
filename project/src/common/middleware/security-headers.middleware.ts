/**
 * =============================================================================
 * SecurityHeadersMiddleware - Middleware إضافة Security Headers
 * =============================================================================
 * تضيف headers أمانية للاستجابات لحماية من هجمات شائعة
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // منع Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // منع MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
    );

    // Strict Transport Security (HTTPS فقط)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(self)',
    );

    // منع فتح الصفحة في نافذة منبثقة
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Resource Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
  }
}
