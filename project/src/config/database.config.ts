/**
 * ============================================================
 * GEM Z - Database Configuration
 * TypeORM - PostgreSQL 16 Connection
 * ============================================================
 * - قراءة الإعدادات من متغيرات البيئة
 * - autoLoadEntities لتسجيل Entities تلقائياً
 * - synchronize: false (استخدام migrations فقط)
 * - logging حسب بيئة التشغيل
 * - SSL في بيئة الإنتاج
 * ============================================================
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * الحصول على إعدادات قاعدة البيانات
 * @returns TypeOrmModuleOptions
 */
export function getDatabaseConfig(): TypeOrmModuleOptions {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  // استخدام DATABASE_URL إذا متوفرة، وإلا نبني الـ URL يدوياً
  const databaseUrl =
    process.env.DATABASE_URL ??
    `postgresql://${process.env.POSTGRES_USER ?? 'gemz'}:${process.env.POSTGRES_PASSWORD ?? 'gemz_secret'}@${process.env.POSTGRES_HOST ?? 'localhost'}:${process.env.POSTGRES_PORT ?? '5432'}/${process.env.POSTGRES_DB ?? 'gemz'}`;

  return {
    type: 'postgres',
    url: databaseUrl,

    // ─── Entities ───
    autoLoadEntities: true, // تحميل الـ Entities تلقائياً من الموديولات

    // ─── Synchronize ───
    synchronize: false, // ⚠️ NEVER true in production - use migrations only

    // ─── Logging ───
    logging: isDev ? ['query', 'error', 'schema'] : ['error'],
    logger: isDev ? 'advanced-console' : 'simple-console',

    // ─── Connection Pool ───
    extra: {
      max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },

    // ─── SSL in Production ───
    ssl: isProd
      ? {
          rejectUnauthorized: false,
        }
      : false,

    // ─── Migrations ───
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    migrationsRun: false, // تشغيل migrations يدوياً
    migrationsTableName: 'migrations',
  };
}

/**
 * مصدر بيانات TypeORM للـ CLI (migrations)
 */
import { DataSource } from 'typeorm';
const connectionSource = new DataSource(getDatabaseConfig() as any);
export default connectionSource;
