import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface FlagContext {
  userId?: string;
  country?: string;
  deviceType?: string;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private redisClient: Redis;

  constructor() {
    // Connect to Redis using env variables
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
   * Check if a feature flag is enabled
   * @param flag The key of the feature flag (e.g. 'MOVE_TO_EARN_ENABLED')
   * @param context Additional metadata about the evaluation context
   */
  async isEnabled(flag: string, context?: FlagContext): Promise<boolean> {
    try {
      const key = `flag:${flag}`;
      const value = await this.redisClient.get(key);
      
      if (!value) {
        // Default flags fallback
        const defaultFlags: Record<string, boolean> = {
          'TABBY_ENABLED': true,
          'TAMARA_ENABLED': true,
          'MOVE_TO_EARN_ENABLED': true,
          'CORPORATE_WELLNESS_ENABLED': true,
          'CREATOR_MONETIZATION_ENABLED': true,
        };
        return defaultFlags[flag] ?? false;
      }

      const flagConfig = JSON.parse(value);
      if (!flagConfig.enabled) {
        return false;
      }

      // Check geo limits
      if (flagConfig.countries && context?.country) {
        if (!flagConfig.countries.includes(context.country)) {
          return false;
        }
      }

      // Check specific user targeting
      if (flagConfig.userIds && context?.userId) {
        if (!flagConfig.userIds.includes(context.userId)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Error evaluating feature flag [${flag}]: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Remote configure a feature flag
   */
  async setFlag(
    flag: string,
    config: { enabled: boolean; countries?: string[]; userIds?: string[] },
  ): Promise<void> {
    const key = `flag:${flag}`;
    await this.redisClient.set(key, JSON.stringify(config));
    this.logger.log(`Feature flag [${flag}] updated: ${JSON.stringify(config)}`);
  }
}
