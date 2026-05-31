/**
 * =============================================================================
 * @RequireRoles() Decorator - التحقق من الأدوار
 * =============================================================================
 */

import { SetMetadata } from '@nestjs/common';

/** مفتاح الـ metadata */
export const ROLES_KEY = 'requiredRoles';

/**
 * Decorator يتطلب أدواراً محددة
 * @param roles - قائمة الأدوار المطلوبة
 * @example
 * ```typescript
 * @RequireRoles('admin', 'super_admin')
 * @Delete('users/:id')
 * async deleteUser() { }
 * ```
 */
export const RequireRoles = (...roles: string[]) => 
  SetMetadata(ROLES_KEY, roles);
