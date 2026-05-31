/**
 * =============================================================================
 * @CurrentUser() Decorator - استخراج المستخدم من الـ Request
 * =============================================================================
 * يستخرج كائن المستخدم من الـ request بعد التحقق من الـ JWT
 */

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Decorator parameter يستخرج معلومات المستخدم الحالي من الـ request
 * @param field - حقل محدد من كائن المستخدم (اختياري)
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: UserEntity) { }
 * 
 * @Get('id')
 * async getUserId(@CurrentUser('id') userId: string) { }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    // إذا طلب حقل محدد
    if (field && typeof user === 'object') {
      const value = user[field];
      if (value === undefined) {
        throw new UnauthorizedException(`User field '${field}' not found`);
      }
      return value;
    }

    return user;
  },
);
