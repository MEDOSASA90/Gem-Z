/**
 * ============================================================================
 * GEM Z - Identity Module
 * RBAC Decorators - ديكوريتورز التحكم بالوصول
 * ============================================================================
 */

import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequirePermissions, PermissionGuard } from './rbac.guard';
import { AuthGuard } from '../auth/auth.guard';

/** ديكوريتور مركب: مصادقة + صلاحيات */
export function AuthWithPermissions(...permissions: string[]) {
  return applyDecorators(
    UseGuards(AuthGuard, PermissionGuard),
    RequirePermissions(...permissions),
  );
}

/** ديكوريتور للصلاحيات فقط (اذا كان AuthGuard مفعل عالمياً) */
export function HasPermissions(...permissions: string[]) {
  return applyDecorators(
    UseGuards(PermissionGuard),
    RequirePermissions(...permissions),
  );
}

export { RequirePermissions, PermissionGuard };
