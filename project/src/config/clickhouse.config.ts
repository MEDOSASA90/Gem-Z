/**
 * ============================================================
 * GEM Z - ClickHouse Configuration
 * Analytics Database
 * ============================================================
 * - Connection URL من متغيرات البيئة
 * - Request timeout
 * - Max open connections
 * - Compression enabled
 * ============================================================
 */

import { Logger } from '@nestjs/common';

/**
 * إعدادات ClickHouse
 */
export interface ClickHouseConfig {
  url: string;
  request_timeout: number;
  max_open_connections: number;
  compression: {
    request: boolean;
    response: boolean;
  };
  database: string;
}

/**
 * الحصول على إعدادات ClickHouse
 */
export function getClickHouseConfig(): ClickHouseConfig {
  const clickhouseUrl = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';

  return {
    // ─── Connection URL ───
    url: clickhouseUrl,

    // ─── Request Timeout ───
    request_timeout: parseInt(
      process.env.CLICKHOUSE_TIMEOUT ?? '30000',
      10,
    ),

    // ─── Connection Pool ───
    max_open_connections: parseInt(
      process.env.CLICKHOUSE_MAX_CONNECTIONS ?? '10',
      10,
    ),

    // ─── Compression ───
    compression: {
      request: true,
      response: true,
    },

    // ─── Default Database ───
    database: process.env.CLICKHOUSE_DATABASE ?? 'gemz_analytics',
  };
}

/**
 * إنشاء ClickHouse client
 * @returns ClickHouse client instance
 */
export function createClickHouseClient() {
  const logger = new Logger('ClickHouse');
  const config = getClickHouseConfig();

  // نستخدم @clickhouse/client
  // يُستورد ديناميكياً لتجنب circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@clickhouse/client');
  const client = createClient({
    url: config.url,
    request_timeout: config.request_timeout,
    max_open_connections: config.max_open_connections,
    compression: config.compression,
    database: config.database,
  });

  // ─── Health Check ───
  client
    .ping()
    .then(() => {
      logger.log('✅ ClickHouse connected');
    })
    .catch((err: Error) => {
      logger.error('❌ ClickHouse connection failed:', err.message);
    });

  return client;
}
