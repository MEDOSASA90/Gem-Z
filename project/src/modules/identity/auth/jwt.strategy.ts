/**
 * ============================================================================
 * GEM Z - Identity Module
 * JwtStrategy - استراتيجية JWT للمصادقة
 * ============================================================================
 * تتحقق من صلاحية Access Token وتستخرج بيانات المستخدم
 * ============================================================================
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** بيانات JWT Payload */
export interface JwtPayload {
  sub: string;       // user id
  email: string;     // بريد المستخدم
  jti: string;       // JWT ID (token hash)
  type: 'access';    // نوع التوكن
  iat: number;
  exp: number;
}

/** بيانات المستخدم بعد التحقق من JWT */
export interface AuthenticatedUser {
  id: string;
  email: string;
  tokenHash: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      // استخراج التوكن من Header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // رفض التوكنات منتهية الصلاحية
      ignoreExpiration: false,
      // المفتاح السري للتحقق من توقيع JWT
      secretOrKey: process.env.JWT_SECRET ?? 'gemz-jwt-secret-change-in-production',
      // التحقق من وقت الاصدار
      clockTolerance: 30,
    });
  }

  /**
   * تُستدعى بعد التحقق من توقيع JWT
   * تُرجع بيانات المستخدم لتوضع على req.user
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    this.logger.debug(`JWT validated for user: ${payload.sub}`);

    if (payload.type !== 'access') {
      throw new UnauthorizedException('نوع التوكن غير صالح');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tokenHash: payload.jti,
    };
  }
}
