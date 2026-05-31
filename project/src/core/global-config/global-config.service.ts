import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class GlobalConfigService {
  private readonly logger = new Logger(GlobalConfigService.name);
  private redisClient: Redis;

  constructor() {
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
   * Get a configuration string value
   */
  async get(key: string, defaultValue: string): Promise<string> {
    try {
      const val = await this.redisClient.get(`config:${key}`);
      return val ?? defaultValue;
    } catch (error) {
      this.logger.error(`Error reading config [${key}]: ${(error as Error).message}`);
      return defaultValue;
    }
  }

  /**
   * Get a configuration numeric value
   */
  async getNumber(key: string, defaultValue: number): Promise<number> {
    const val = await this.get(key, defaultValue.toString());
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Set a configuration value
   */
  async set(key: string, value: string): Promise<void> {
    await this.redisClient.set(`config:${key}`, value);
    this.logger.log(`Global config updated: [${key}] = [${value}]`);
  }
}
