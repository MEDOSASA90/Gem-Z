/**
 * =============================================================================
 * AuthGuard - حماية JWT + Redis Check
 * =============================================================================
 * يتحقق من صحة JWT token ويتحقق من أن الجلسة نشطة في Redis
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  jti: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private redis: Redis | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redisDb = this.configService.get<number>('REDIS_SESSION_DB', 1);

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        db: redisDb,
        password: redisPassword || undefined,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 2,
      });
    } catch (error) {
      this.logger.error('Failed to connect to Redis: %s', (error as Error).message);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // التحقق مما إذا كان الـ route public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      // التحقق من الـ JWT
      const secret = this.configService.get<string>('JWT_SECRET', 'default-secret');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });

      // التحقق من أن الـ token غير منتهي الصلاحية
      if (payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token has expired');
      }

      // التحقق من Redis - هل الجلسة لا تزال نشطة؟
      if (this.redis) {
        const sessionKey = `session:${payload.sub}:${payload.jti}`;
        const sessionExists = await this.redis.exists(sessionKey);

        if (!sessionExists) {
          throw new UnauthorizedException('Session has been invalidated');
        }

        // تحديث TTL للجلسة
        await this.redis.expire(sessionKey, 3600);
      }

      // إرفاق المستخدم بالـ request
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('Token validation failed: %s', (error as Error).message);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /** استخراج الـ token من الـ header */
  private extractToken(request: { headers: { authorization?: string } }): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }

    return null;
  }
}
