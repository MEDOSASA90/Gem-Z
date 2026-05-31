/**
 * ============================================================================
 * GEM Z - Identity Module
 * AuthGuard - حارس المصادقة JWT
 * ============================================================================
 * يحمي المسارات ويتحقق من صلاحية JWT token
 * - يفك تشفير JWT
 * - يتحقق من الجلسة في Redis
 * - يربط المستخدم بالطلب
 * - يدعم المسارات العامة @Public()
 * ============================================================================
 */

import {
  Injectable, CanActivate, ExecutionContext, Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { SessionService } from '../session/session.service';
import { UserService } from '../user/user.service';

interface JwtPayload {
  sub: string;       // user id
  email: string;
  jti: string;       // token hash
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; [key: string]: unknown };
  sessionId?: string;
  tokenHash?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // التحقق اذا كان المسار عاماً
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isPublic) return true;

    // استخراج Token من Header
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('لم يتم توفير رمز المصادقة');
    }

    try {
      // فك تشفير JWT
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        clockTolerance: 30, // 30 ثانية انحراف مسموح
      });

      // التحقق من الجلسة في Redis (سريع)
      const tokenHash = this.sessionService.hashToken(token);
      const sessionData = await this.sessionService.validateTokenHash(tokenHash);
      if (!sessionData) {
        throw new UnauthorizedException('الجلسة غير صالحة أو منتهية');
      }

      // التحقق من صلاحية الجلسة في DB
      const isValid = await this.sessionService.validate(sessionData.sessionId);
      if (!isValid) {
        throw new UnauthorizedException('الجلسة ملغاة');
      }

      // تحميل بيانات المستخدم
      const user = await this.userService.findById(payload.sub);
      if (!user.isActive) {
        throw new UnauthorizedException('الحساب غير نشط');
      }

      // تعيين المستخدم والجلسة على الطلب
      request.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
      };
      request.sessionId = sessionData.sessionId;
      request.tokenHash = tokenHash;

      // تحديث وقت النشاط الاخير
      await this.sessionService.updateActivityByToken(tokenHash);

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'رمز المصادقة غير صالح';
      this.logger.warn(`Auth failed: ${message}`);
      throw new UnauthorizedException(message);
    }
  }

  /** استخراج Bearer Token من Header */
  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
