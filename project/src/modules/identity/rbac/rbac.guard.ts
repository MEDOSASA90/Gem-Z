/**
 * ============================================================================
 * GEM Z - Identity Module
 * PermissionGuard - حارس الصلاحيات
 * ============================================================================
 * يتحقق من امتلاك المستخدم للصلاحيات المطلوبة
 * @RequirePermissions('wallet:read', 'payout:approve')
 * ============================================================================
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACService } from './rbac.service';

/** Metadata key للصلاحيات المطلوبة */
export const PERMISSIONS_KEY = 'requiredPermissions';

/** ديكوريتور لتحديد الصلاحيات المطلوبة */
import { SetMetadata } from '@nestjs/common';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RBACService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id as string | undefined;

    if (!userId) {
      throw new ForbiddenException('المستخدم غير مصادق');
    }

    // التحقق من كل الصلاحيات المطلوبة
    const checks = await this.rbacService.checkPermissions(userId, requiredPermissions);
    const missing = requiredPermissions.filter(p => !checks[p]);

    if (missing.length > 0) {
      this.logger.warn(`Permission denied for user ${userId}: missing ${missing.join(', ')}`);
      throw new ForbiddenException(`صلاحيات مطلوبة مفقودة: ${missing.join(', ')}`);
    }

    return true;
  }
}
