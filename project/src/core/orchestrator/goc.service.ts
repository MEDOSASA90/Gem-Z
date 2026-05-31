import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { GemZOrchestrator } from './orchestrator.service';

@Injectable()
export class GlobalOperationsCenterService {
  private readonly logger = new Logger(GlobalOperationsCenterService.name);
  private redisClient: Redis;

  constructor(private readonly orchestrator: GemZOrchestrator) {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    const db = parseInt(process.env.REDIS_DB ?? '0', 10);

    this.redisClient = new Redis({
      host,
      port,
      db,
      password,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  }

  /**
   * Fetch a unified operational status report of GEM Z
   */
  async getOperationalStatus(): Promise<{
    systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    dlqCount: number;
    activeSagasCount: number;
    activeLocksCount: number;
    metrics: Record<string, any>;
  }> {
    this.logger.log('Fetching Global Operations Center system metrics...');
    
    // 1. Get DLQ count from Redis
    const dlqCount = await this.redisClient.llen('dlq:failed_events').catch(() => 0);

    // 2. Get active distributed locks
    const keys = await this.redisClient.keys('lock:*').catch(() => []);
    const activeLocksCount = keys.length;

    // 3. Get active Sagas from Orchestrator
    const activeSagas = this.orchestrator.getActiveSagas();
    const activeSagasCount = activeSagas.length;

    // 4. Calculate overall system health
    let systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (dlqCount > 50 || activeSagasCount > 200) {
      systemHealth = 'CRITICAL';
    } else if (dlqCount > 10 || activeLocksCount > 50) {
      systemHealth = 'DEGRADED';
    }

    return {
      systemHealth,
      dlqCount,
      activeSagasCount,
      activeLocksCount,
      metrics: {
        timestamp: new Date().toISOString(),
        redisOnline: this.redisClient.status === 'ready',
        locksList: keys,
      },
    };
  }
}
