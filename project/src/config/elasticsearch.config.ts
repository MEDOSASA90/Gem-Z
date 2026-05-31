/**
 * ============================================================
 * GEM Z - Elasticsearch Configuration
 * Search Engine v8.x
 * ============================================================
 * - Connection URL من متغيرات البيئة
 * - Request timeout
 * - Sniffing disabled (Docker environment)
 * ============================================================
 */

import { Logger } from '@nestjs/common';

/**
 * إعدادات Elasticsearch
 */
export interface ElasticsearchConfig {
  node: string;
  requestTimeout: number;
  sniffOnStart: boolean;
  sniffOnConnectionFault: boolean;
  maxRetries: number;
}

/**
 * الحصول على إعدادات Elasticsearch
 */
export function getElasticsearchConfig(): ElasticsearchConfig {
  return {
    // ─── Connection URL ───
    node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',

    // ─── Request Timeout ───
    requestTimeout: parseInt(
      process.env.ES_REQUEST_TIMEOUT ?? '30000',
      10,
    ),

    // ─── Sniffing ───
    // معطّل في بيئة Docker لأن IPs ديناميكية
    sniffOnStart: false,
    sniffOnConnectionFault: false,

    // ─── Max Retries ───
    maxRetries: 3,
  };
}

/**
 * إنشاء Elasticsearch client (للاستخدام خارج NestJS DI)
 */
export function createElasticsearchClient() {
  const logger = new Logger('Elasticsearch');
  const config = getElasticsearchConfig();

  // نستخدم @elastic/elasticsearch client
  // يُستورد ديناميكياً لتجنب circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('@elastic/elasticsearch');
  const client = new Client({
    node: config.node,
    requestTimeout: config.requestTimeout,
    sniffOnStart: config.sniffOnStart,
    sniffOnConnectionFault: config.sniffOnConnectionFault,
    maxRetries: config.maxRetries,
  });

  // ─── Health Check ───
  client
    .ping()
    .then(() => {
      logger.log('✅ Elasticsearch connected');
    })
    .catch((err: Error) => {
      logger.error('❌ Elasticsearch connection failed:', err.message);
    });

  return client;
}
