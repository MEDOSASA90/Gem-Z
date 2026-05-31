/**
 * ============================================================================
 * GEM Z - Identity Module
 * RefreshStrategy - استراتيجية Refresh Token
 * ============================================================================
 * تتحقق من صلاحية Refresh Token لانشاء Access Token جديد
 * ============================================================================
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** بيانات Refresh Token Payload */
export interface RefreshPayload {
  sub: string;        // user id
  jti: string;        // refresh token hash
  type: 'refresh';    // نوع التوكن
  iat: number;
  exp: number;
}

/** نتيجة التحقق من Refresh Token */
export interface RefreshValidateResult {
  userId: string;
  refreshTokenHash: string;
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(RefreshStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'gemz-jwt-refresh-secret',
      clockTolerance: 60,
      passReqToCallback: true,
    });
  }

  /**
   * تُستدعى بعد التحقق من توقيع Refresh Token
   * @param req - طلب HTTP
   * @param payload - بيانات JWT
   */
  async validate(req: Request, payload: RefreshPayload): Promise<RefreshValidateResult> {
    this.logger.debug(`Refresh token validated for user: ${payload.sub}`);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('نوع التوكن غير صالح');
    }

    return {
      userId: payload.sub,
      refreshTokenHash: payload.jti,
    };
  }
}
