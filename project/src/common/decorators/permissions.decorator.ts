/**
 * =============================================================================
 * @RequirePermissions() Decorator - التحقق من صلاحيات RBAC
 * =============================================================================
 */

import { SetMetadata } from '@nestjs/common';

/** مفتاح الـ metadata */
export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Decorator يتطلب صلاحيات محددة
 * @param scopes - قائمة الصلاحيات المطلوبة
 * @example
 * ```typescript
 * @RequirePermissions('users:read', 'users:write')
 * @Get('users')
 * async getUsers() { }
 * ```
 */
export const RequirePermissions = (...scopes: string[]) => 
  SetMetadata(PERMISSIONS_KEY, scopes);
