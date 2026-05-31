/**
 * ============================================================================
 * GEM Z - Identity Module
 * AuthModule - وحدة المصادقة
 * ============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MFAService } from './mfa.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshStrategy } from './refresh.strategy';
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'gemz-jwt-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    UserModule,
    SessionModule,
    RedisModule,
  ],
  providers: [AuthService, MFAService, JwtStrategy, RefreshStrategy, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, MFAService, AuthGuard, JwtModule],
})
export class AuthModule {}
