/**
 * ============================================================================
 * GEM Z - Identity Module
 * RBACModule - وحدة التحكم بالوصول القائم على الأدوار
 * ============================================================================
 */

import { Module, OnModuleInit, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { UserRole } from './user-role.entity';
import { RBACService } from './rbac.service';
import { RBACController } from './rbac.controller';
import { PermissionGuard } from './rbac.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, UserRole]),
    AuthModule,
    UserModule,
    SessionModule,
  ],
  providers: [RBACService, PermissionGuard],
  controllers: [RBACController],
  exports: [RBACService, PermissionGuard, TypeOrmModule],
})
export class RBACModule implements OnModuleInit {
  constructor(private readonly rbacService: RBACService) {}

  async onModuleInit(): Promise<void> {
    // تهيئة الادوار والصلاحيات الافتراضية عند بدء التطبيق
    try {
      await this.rbacService.seedDefaults();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`RBAC seed skipped (may already exist): ${msg}`);
    }
  }
}
