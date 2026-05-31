/**
 * ============================================================================
 * GEM Z - Identity Module
 * IdentityModule - وحدة الهوية والامان الرئيسية
 * ============================================================================
 * تجمع كل الوحدات الفرعية:
 * - User (ادارة المستخدمين)
 * - Auth (المصادقة)
 * - RBAC (التحكم بالوصول)
 * - KYC (التحقق من الهوية)
 * - Session (ادارة الجلسات)
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RBACModule } from './rbac/rbac.module';
import { KYCModule } from './kyc/kyc.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    UserModule,
    SessionModule,
    AuthModule,
    RBACModule,
    KYCModule,
  ],
  exports: [UserModule, AuthModule, RBACModule, KYCModule, SessionModule],
})
export class IdentityModule {}
