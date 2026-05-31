/**
 * ============================================================
 * GEM Z - General Application Configuration
 * App, JWT, Bcrypt, Rate Limiting
 * ============================================================
 * - Server port
 * - JWT secret, expiry, refresh expiry
 * - Bcrypt rounds
 * - Rate limiting defaults
 * - CORS origin
 * - API versioning
 * ============================================================
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('AppConfig');

/**
 * إعدادات التطبيق العامة
 */
export interface AppConfig {
  // ─── Server ───
  nodeEnv: string;
  port: number;
  apiVersion: string;

  // ─── JWT ───
  jwtSecret: string;
  jwtExpiry: string;
  jwtRefreshExpiry: string;

  // ─── Security ───
  bcryptRounds: number;
  mfaIssuer: string;

  // ─── Rate Limiting ───
  rateLimitTtl: number;
  rateLimitMax: number;

  // ─── CORS ───
  corsOrigin: string[];

  // ─── Logging ───
  logLevel: string;
}

/**
 * الحصول على إعدادات التطبيق
 * @returns AppConfig
 */
export function getAppConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.warn(
      '⚠️ JWT_SECRET not set! Using fallback - NOT SECURE FOR PRODUCTION!',
    );
  }

  return {
    // ─── Server ───
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiVersion: process.env.API_VERSION ?? 'v1',

    // ─── JWT ───
    jwtSecret: jwtSecret ?? 'gemz_development_jwt_secret_not_for_production',
    jwtExpiry: process.env.JWT_EXPIRY ?? '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',

    // ─── Security ───
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    mfaIssuer: process.env.MFA_ISSUER ?? 'GEMZ',

    // ─── Rate Limiting ───
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),

    // ─── CORS ───
    corsOrigin:
      process.env.CORS_ORIGIN?.split(',') ??
      (process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://localhost:4200']),

    // ─── Logging ───
    logLevel: process.env.LOG_LEVEL ?? 'debug',
  };
}

/**
 * التحقق من إعدادات الإنتاج
 * تتأكد من أن كل الإعدادات الحساسة مُعرفة في بيئة الإنتاج
 */
export function validateProductionConfig(config: AppConfig): void {
  if (config.nodeEnv !== 'production') return;

  const missing: string[] = [];

  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.REDIS_URL) missing.push('REDIS_URL');
  if (config.jwtSecret.includes('development')) {
    throw new Error(
      '❌ INSECURE JWT_SECRET detected in production! Set a strong secret.',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required production environment variables: ${missing.join(', ')}`,
    );
  }

  logger.log('✅ Production config validation passed');
}
