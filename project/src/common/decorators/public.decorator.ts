/**
 * =============================================================================
 * @Public() Decorator - تحديد Route كـ Public
 * =============================================================================
 * يُستخدم لتحديد route أو controller كـ public (لا يحتاج مصادقة)
 */

import { SetMetadata } from '@nestjs/common';

/** مفتاح الـ metadata */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator لتحديد route كـ public
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * async healthCheck() { }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
