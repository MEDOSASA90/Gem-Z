/**
 * ============================================================================
 * GEM Z - Identity Module
 * Auth Decorators - الديكوريتورز المخصصة للمصادقة
 * ============================================================================
 * @Public() - للمسارات العامة (بدون مصادقة)
 * @CurrentUser() - لاستخراج المستخدم من الطلب
 * @RequireMFA() - للمسارات التي تتطلب MFA
 * ============================================================================
 */

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { User } from '../user/user.entity';

/** Metadata key للمسارات العامة */
export const IS_PUBLIC_KEY = 'isPublic';

/** ديكوريتور لجعل المسار عاماً بدون مصادقة */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Metadata key لـ MFA */
export const REQUIRE_MFA_KEY = 'requireMFA';

/** ديكوريتور لطلب MFA على المسار */
export const RequireMFA = () => SetMetadata(REQUIRE_MFA_KEY, true);

/** ديكوريتور لاستخراج المستخدم الحالي من الطلب */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);

/** ديكوريتور لاستخراج بصمة الجهاز من الطلب */
export const DeviceFingerprint = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-device-fingerprint'] as string | undefined;
  },
);

/** ديكوريتور لاستخراج معرف الجلسة من الطلب */
export const SessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.sessionId as string | undefined;
  },
);
