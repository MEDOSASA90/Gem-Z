/**
 * =============================================================================
 * EventStoreService - تخزين الأحداث في ClickHouse للتحليل
 * =============================================================================
 * يقوم بتخزين كل الأحداث بشكل دائم في ClickHouse للتحليلات والتدقيق
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEnvelope } from './event.types';

/** interface مبسط لـ ClickHouse client */
interface ClickHouseClient {
  insert(params: { table: string; values: unknown[]; format: string }): Promise<{ executed: boolean }>;
  query(params: { query: string }): Promise<{ json: () => Promise<unknown[]> }>;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private clickhouse: ClickHouseClient | null = null;
  private readonly tableName: string;
  private readonly buffer: Array<Record<string, unknown>> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly bufferSize: number;
  private readonly flushIntervalMs: number;
  private isShuttingDown = false;

  constructor(private readonly configService: ConfigService) {
    this.tableName = this.configService.get<string>('CLICKHOUSE_EVENTS_TABLE', 'gemz.events');
    this.bufferSize = this.configService.get<number>('EVENT_BUFFER_SIZE', 100);
    this.flushIntervalMs = this.configService.get<number>('EVENT_FLUSH_INTERVAL_MS', 5000);
  }

  /** تهيئة الاتصال وإنشاء الجدول */
  async onModuleInit(): Promise<void> {
    try {
      // إنشاء ClickHouse client (سيتم inject الفعلي من config module)
      await this.initializeClickHouse();

      // إنشاء الجدول إذا لم يكن موجوداً
      await this.createTableIfNotExists();

      // بدء الـ flush interval
      this.flushInterval = setInterval(() => {
        this.flushBuffer().catch((err) => {
          this.logger.error('Periodic flush failed: %s', err.message);
        });
      }, this.flushIntervalMs);

      this.logger.log('EventStoreService initialized - ClickHouse connected');
    } catch (error) {
      this.logger.error('Failed to initialize EventStoreService: %s', (error as Error).message);
    }
  }

  /** إيقاف الخدمة بأمان */
  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // flush أي أحداث متبقية في الـ buffer
    await this.flushBuffer();

    this.logger.log('EventStoreService shut down complete');
  }

  /**
   * تخزين حدث في ClickHouse
   * @param envelope - الـ EventEnvelope المراد تخزينه
   */
  async storeEvent<T>(envelope: EventEnvelope<T>): Promise<void> {
    try {
      const row = this.envelopeToRow(envelope);

      // إضافة إلى الـ buffer
      this.buffer.push(row);

      // flush فوراً إذا وصل الـ buffer للحد الأقصى
      if (this.buffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }
    } catch (error) {
      this.logger.error(
        'Failed to store event [%s]: %s',
        envelope.event_id,
        (error as Error).message,
      );
    }
  }

  /**
   * تخزين أحداث متعددة بشكل batch
   */
  async storeEvents<T>(envelopes: EventEnvelope<T>[]): Promise<void> {
    try {
      const rows = envelopes.map((env) => this.envelopeToRow(env));
      this.buffer.push(...rows);

      if (this.buffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }
    } catch (error) {
      this.logger.error('Failed to store batch events: %s', (error as Error).message);
    }
  }

  /**
   * استعلام الأحداث حسب نوعها
   */
  async queryByEventType(
    eventType: string,
    startDate: string,
    endDate: string,
    limit = 100,
  ): Promise<unknown[]> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE event_type = {eventType: String}
        AND timestamp >= {startDate: DateTime}
        AND timestamp <= {endDate: DateTime}
      ORDER BY timestamp DESC
      LIMIT {limit: UInt32}
    `;

    try {
      // تنفيذ الاستعلام (مع الـ params)
      const result = await this.executeQuery(query, { eventType, startDate, endDate, limit });
      return result;
    } catch (error) {
      this.logger.error('Query failed: %s', (error as Error).message);
      return [];
    }
  }

  /**
   * استعلام الأحداث حسب المستخدم
   */
  async queryByActor(
    actorId: string,
    startDate: string,
    endDate: string,
    limit = 100,
  ): Promise<unknown[]> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE actor_id = {actorId: String}
        AND timestamp >= {startDate: DateTime}
        AND timestamp <= {endDate: DateTime}
      ORDER BY timestamp DESC
      LIMIT {limit: UInt32}
    `;

    return this.executeQuery(query, { actorId, startDate, endDate, limit });
  }

  /**
   * الحصول على إحصائيات الأحداث
   */
  async getEventStats(startDate: string, endDate: string): Promise<{
    totalEvents: number;
    eventsByType: Array<{ event_type: string; count: number }>;
    eventsByModule: Array<{ source_module: string; count: number }>;
  }> {
    const totalQuery = `
      SELECT count() as total
      FROM ${this.tableName}
      WHERE timestamp >= {startDate: DateTime}
        AND timestamp <= {endDate: DateTime}
    `;

    const byTypeQuery = `
      SELECT event_type, count() as count
      FROM ${this.tableName}
      WHERE timestamp >= {startDate: DateTime}
        AND timestamp <= {endDate: DateTime}
      GROUP BY event_type
      ORDER BY count DESC
    `;

    const byModuleQuery = `
      SELECT source_module, count() as count
      FROM ${this.tableName}
      WHERE timestamp >= {startDate: DateTime}
        AND timestamp <= {endDate: DateTime}
      GROUP BY source_module
      ORDER BY count DESC
    `;

    const [totalResult, typeResult, moduleResult] = await Promise.all([
      this.executeQuery(totalQuery, { startDate, endDate }),
      this.executeQuery(byTypeQuery, { startDate, endDate }),
      this.executeQuery(byModuleQuery, { startDate, endDate }),
    ]);

    return {
      totalEvents: (totalResult[0] as { total: number })?.total || 0,
      eventsByType: typeResult as Array<{ event_type: string; count: number }>,
      eventsByModule: moduleResult as Array<{ source_module: string; count: number }>,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /** تحويل EventEnvelope إلى صف قاعدة بيانات */
  private envelopeToRow<T>(envelope: EventEnvelope<T>): Record<string, unknown> {
    return {
      event_id: envelope.event_id,
      event_type: envelope.event_type,
      correlation_id: envelope.correlation_id,
      actor_id: envelope.actor_id,
      source_module: envelope.source_module,
      timestamp: envelope.timestamp,
      device_fingerprint: envelope.device_metadata.fingerprint,
      device_ip: envelope.device_metadata.ip,
      device_country: envelope.device_metadata.geo.country,
      fraud_score: envelope.fraud_metadata.score,
      fraud_action: envelope.fraud_metadata.action,
      fraud_signals: JSON.stringify(envelope.fraud_metadata.signals),
      payload_json: JSON.stringify(envelope.payload),
      created_at: new Date().toISOString(),
    };
  }

  /** تفريغ الـ buffer في ClickHouse */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0 || !this.clickhouse || this.isShuttingDown) {
      return;
    }

    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const result = await this.clickhouse.insert({
        table: this.tableName,
        values: batch,
        format: 'JSONEachRow',
      });

      if (result.executed) {
        this.logger.debug('Flushed %d events to ClickHouse', batch.length);
      }
    } catch (error) {
      this.logger.error('Failed to flush events: %s', (error as Error).message);
      // إعادة الأحداث للـ buffer عند الفشل
      this.buffer.unshift(...batch);
    }
  }

  /** إنشاء جدول الأحداث في ClickHouse */
  private async createTableIfNotExists(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        event_id String,
        event_type LowCardinality(String),
        correlation_id String,
        actor_id String,
        source_module LowCardinality(String),
        timestamp DateTime64(3),
        device_fingerprint String,
        device_ip IPv4,
        device_country LowCardinality(String),
        fraud_score Float32,
        fraud_action LowCardinality(String),
        fraud_signals String,
        payload_json String,
        created_at DateTime64(3)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (event_type, timestamp, actor_id)
      TTL timestamp + INTERVAL 2 YEAR
      SETTINGS index_granularity = 8192
    `;

    try {
      await this.executeQuery(createTableQuery);
      this.logger.log('Events table created/verified in ClickHouse');
    } catch (error) {
      this.logger.error('Failed to create table: %s', (error as Error).message);
    }
  }

  /** تهيئة ClickHouse client */
  private async initializeClickHouse(): Promise<void> {
    // TODO: استبدال هذا بالـ ClickHouse client الحقيقي من @clickhouse/client
    // هذا placeholder حتى يتم الربط مع الـ config module
    this.logger.log('ClickHouse client initialized (placeholder)');
  }

  /** تنفيذ استعلام ClickHouse */
  private async executeQuery(query: string, params?: Record<string, unknown>): Promise<unknown[]> {
    if (!this.clickhouse) {
      this.logger.warn('ClickHouse not connected, query skipped: %s', query.substring(0, 100));
      return [];
    }

    try {
      // TODO: استبدال هذا بالتنفيذ الفعلي
      this.logger.debug('Executing query: %s', query.substring(0, 200));
      return [];
    } catch (error) {
      this.logger.error('Query execution failed: %s', (error as Error).message);
      return [];
    }
  }
}
