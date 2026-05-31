import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { GlobalConfigService } from '../../../core/global-config/global-config.service';

export interface AICostRecord {
  targetId: string;
  targetType: 'USER' | 'GYM' | 'COMPANY';
  promptTokens: number;
  completionTokens: number;
  model: 'gpt-4o' | 'claude-3-5' | 'vision-body-segmentation';
}

@Injectable()
export class AICostRouterService {
  private readonly logger = new Logger(AICostRouterService.name);
  private redisClient: Redis;

  constructor(private readonly config: GlobalConfigService) {
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
   * Track AI operation cost and enforce quotas
   * Throws an exception if user/client has exceeded their configured budget limits
   */
  async trackAndValidate(record: AICostRecord): Promise<{ currentSpend: number; limit: number }> {
    const dailyLimit = await this.config.getNumber(`ai_daily_limit_${record.targetType.toLowerCase()}`, 5.0); // standard $5 limit
    const key = `ai:spend:${record.targetType.toLowerCase()}:${record.targetId}:${new Date().toISOString().substring(0, 10)}`;

    // Resolve rates (e.g. GPT-4o: $5.00 / 1M prompt, $15.00 / 1M completion)
    let cost = 0.0;
    if (record.model === 'vision-body-segmentation') {
      cost = await this.config.getNumber('ai_vision_cost_per_run', 0.05); // 5 cents per run
    } else {
      const promptRate = record.model === 'gpt-4o' ? 0.000005 : 0.000003;
      const completionRate = record.model === 'gpt-4o' ? 0.000015 : 0.000015;
      cost = (record.promptTokens * promptRate) + (record.completionTokens * completionRate);
    }

    // Read current daily spend
    const rawSpend = await this.redisClient.get(key);
    const currentSpend = rawSpend ? parseFloat(rawSpend) : 0.0;

    if (currentSpend + cost > dailyLimit) {
      this.logger.warn(`AI Cost quota exceeded for [${record.targetId}]. Spend: ${currentSpend}, cost: ${cost}, limit: ${dailyLimit}`);
      throw new BadRequestException('AI daily subscription quota exceeded. Upgrade your plan to continue.');
    }

    // Increment daily spend
    const newSpend = currentSpend + cost;
    await this.redisClient.setex(key, 86400, newSpend.toFixed(6)); // TTL 24 hours

    this.logger.log(`AI cost tracked for [${record.targetId}]: +$${cost.toFixed(6)} (New daily: $${newSpend.toFixed(6)} / $${dailyLimit})`);
    return { currentSpend: newSpend, limit: dailyLimit };
  }
}
