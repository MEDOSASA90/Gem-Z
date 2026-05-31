/**
 * =============================================================================
 * HealthController - نقاط نهاية فحص الصحة
 * =============================================================================
 * توفر endpoints للتحقق من صحة كل الخدمات
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTimeMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface HealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    database: HealthStatus;
    redis: HealthStatus;
    clickhouse: HealthStatus;
    elasticsearch: HealthStatus;
  };
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime: number;
  private redisClient: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
      });
    } catch {
      this.redisClient = null;
    }
  }

  /** فحص الصحة العامة */
  @Get()
  async check(): Promise<HealthReport> {
    const startTime = Date.now();

    const [dbHealth, redisHealth, clickhouseHealth, esHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkClickHouse(),
      this.checkElasticsearch(),
    ]);

    const responseTime = Date.now() - startTime;

    // تحديد الحالة العامة
    const allHealthy = [dbHealth, redisHealth, clickhouseHealth, esHealth]
      .every((h) => h.status === 'healthy');
    const anyUnhealthy = [dbHealth, redisHealth, clickhouseHealth, esHealth]
      .some((h) => h.status === 'unhealthy');

    const overallStatus = anyUnhealthy 
      ? 'unhealthy' 
      : (allHealthy ? 'healthy' : 'degraded');

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      services: {
        database: dbHealth,
        redis: redisHealth,
        clickhouse: clickhouseHealth,
        elasticsearch: esHealth,
      },
    };

    this.logger.debug('Health check completed in %dms - Status: %s', responseTime, overallStatus);

    return report;
  }

  /** فحص PostgreSQL */
  @Get('db')
  async checkDb(): Promise<HealthStatus> {
    return this.checkDatabase();
  }

  /** فحص Redis */
  @Get('redis')
  async checkRedisEndpoint(): Promise<HealthStatus> {
    return this.checkRedis();
  }

  /** فحص ClickHouse */
  @Get('clickhouse')
  async checkClickhouseEndpoint(): Promise<HealthStatus> {
    return this.checkClickHouse();
  }

  /** فحص Elasticsearch */
  @Get('elasticsearch')
  async checkElasticsearchEndpoint(): Promise<HealthStatus> {
    return this.checkElasticsearch();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // TODO: استبدال هذا بالفحص الفعلي لـ PostgreSQL عبر TypeORM
      // const connection = getConnection();
      // await connection.query('SELECT 1');

      // For now: placeholder
      const isHealthy = true; // Replace with actual check

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs: Date.now() - start,
        details: { type: 'PostgreSQL', host: this.configService.get('DB_HOST', 'localhost') },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        error: (error as Error).message,
        details: { type: 'PostgreSQL' },
      };
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      if (!this.redisClient) {
        return {
          status: 'unhealthy',
          responseTimeMs: 0,
          error: 'Redis client not initialized',
        };
      }

      const pingResult = await this.redisClient.ping();
      const isHealthy = pingResult === 'PONG';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs: Date.now() - start,
        details: { type: 'Redis', ping: pingResult },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        error: (error as Error).message,
        details: { type: 'Redis' },
      };
    }
  }

  private async checkClickHouse(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // TODO: استبدال هذا بالفحص الفعلي لـ ClickHouse
      const isHealthy = true; // Replace with actual check

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs: Date.now() - start,
        details: { type: 'ClickHouse', host: this.configService.get('CLICKHOUSE_HOST', 'localhost') },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        error: (error as Error).message,
        details: { type: 'ClickHouse' },
      };
    }
  }

  private async checkElasticsearch(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // TODO: استبدال هذا بالفحص الفعلي لـ Elasticsearch
      const isHealthy = true; // Replace with actual check

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs: Date.now() - start,
        details: { type: 'Elasticsearch', host: this.configService.get('ES_HOST', 'localhost') },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        error: (error as Error).message,
        details: { type: 'Elasticsearch' },
      };
    }
  }
}
