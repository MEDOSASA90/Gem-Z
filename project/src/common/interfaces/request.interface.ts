/**
 * =============================================================================
 * RequestWithUser - Request ممتد مع معلومات المستخدم
 * =============================================================================
 */

import { Request } from 'express';

/** معلومات المستخدم في الـ Request */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions?: string[];
  jti?: string;
  iat?: number;
  exp?: number;
  sessionId?: string;
}

/** Request ممتد يحتوي على معلومات المستخدم */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  correlationId: string;
  requestId: string;
}

/** Request مع معلومات الجهاز */
export interface RequestWithDevice extends RequestWithUser {
  deviceInfo: {
    fingerprint: string;
    userAgent: string;
    ip: string;
    geo: {
      country: string;
      city: string;
      lat: number;
      lon: number;
    };
  };
}
