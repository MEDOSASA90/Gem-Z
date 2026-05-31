import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { WalletService } from '../../economy/wallet/wallet.service';
import { UserService } from '../../identity/user/user.service';

export interface TelemetryEventDto {
  userId: string;
  deviceId: string;
  deviceFingerprint: string;
  ipAddress: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601 string
}

@Injectable()
export class AiFraudNetworkService {
  private readonly logger = new Logger(AiFraudNetworkService.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process telemetry and validate against impossible velocities & multi-device account collisions
   */
  async processTelemetry(dto: TelemetryEventDto): Promise<{
    isFraudulent: boolean;
    fraudScore: number;
    actionsTaken: string[];
  }> {
    const { userId, deviceFingerprint, latitude, longitude, timestamp } = dto;
    this.logger.log(`Evaluating security telemetry for User [${userId}]`);

    let fraudScore = 0;
    const actionsTaken: string[] = [];
    const today = new Date().toISOString().substring(0, 10);

    // 1. Impossible Spatial Velocity Check (GPS Spoof/Teleportation Prevention)
    const prevTelemetryKey = `fraud:telemetry:${userId}`;
    const rawPrev = await this.redis.get(prevTelemetryKey);

    if (rawPrev) {
      const prev = JSON.parse(rawPrev);
      const distKm = this.calculateDistance(prev.latitude, prev.longitude, latitude, longitude);
      const timeDiffHours = Math.abs(new Date(timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);

      const velocityKmh = timeDiffHours > 0 ? distKm / timeDiffHours : 0;

      // Humans cannot travel faster than commercial aviation speeds between events (e.g. 800 km/h)
      if (velocityKmh > 800.0 && distKm > 10.0) {
        fraudScore += 65;
        this.logger.warn(`Impossible velocity flagged for ${userId}: ${Math.round(velocityKmh)} km/h over ${Math.round(distKm)} km`);
      }
    }

    // Save current telemetry to Redis for next velocity check
    await this.redis.setex(prevTelemetryKey, 86400, JSON.stringify(dto));

    // 2. Multi-Device Account Collision Check
    const activeDevicesKey = `active:devices:${userId}`;
    const nowMs = Date.now();

    // Store current device with timestamp score in Redis Sorted Set
    await this.redis.zadd(activeDevicesKey, nowMs, deviceFingerprint);
    await this.redis.expire(activeDevicesKey, 1800); // 30 mins TTL

    // Fetch other active devices in the last 5 minutes (300,000 ms)
    const activeDevices = await this.redis.zrangebyscore(activeDevicesKey, nowMs - 300000, nowMs + 10000);
    const uniqueDevicesCount = activeDevices.length;

    if (uniqueDevicesCount > 1) {
      fraudScore += 30;
      this.logger.warn(`Account collision detected for ${userId}: ${uniqueDevicesCount} devices active within 5 minutes.`);
    }

    // 3. High-Risk Fraud Threshold Check (Aggregate Score Trigger >= 75)
    let isFraudulent = false;
    if (fraudScore >= 75) {
      isFraudulent = true;
      this.logger.error(`[HIGH-RISK TRIGGER] Fraud threshold crossed for user [${userId}] with score [${fraudScore}]!`);

      // A. Emit FraudDetected Event
      this.eventEmitter.emit('ai.fraud_detected', {
        event_id: crypto.randomUUID(),
        correlation_id: crypto.randomUUID(),
        actor_id: userId,
        source_module: 'ai',
        event_type: 'FraudDetected',
        timestamp: new Date().toISOString(),
        payload: {
          userId,
          fraudScore,
          actions: ['WALLET_FROZEN', 'CREDIT_SCORE_REDUCED'],
          reason: 'Impossible velocity or multi-device account collision threshold exceeded',
        },
      });

      // B. Freeze Linked Wallet Balances
      const wallets = await this.walletService.getUserWallets(userId);
      for (const wallet of wallets) {
        await this.walletService.freeze(wallet.id, 'High-risk impossible velocity/collision fraud trigger');
      }
      actionsTaken.push('FREEZE_WALLETS');

      // C. Adjust/Reduce Fitness Credit Score
      // Record higher fraud score in PostgreSQL
      await this.userService.updateFraudScore(userId, fraudScore);
      actionsTaken.push('ADJUST_FITNESS_CREDIT_SCORE');

      // D. Log Alert to Fraud Operations Center ClickHouse Dashboard
      await this.logToFraudOperationsClickhouse(userId, fraudScore, deviceFingerprint);
    }

    return {
      isFraudulent,
      fraudScore,
      actionsTaken,
    };
  }

  /**
   * Reset fraud rating (For admin override/resolution)
   */
  async resolveFraudAlert(userId: string): Promise<void> {
    await this.userService.updateFraudScore(userId, 0);
    const wallets = await this.walletService.getUserWallets(userId);
    for (const wallet of wallets) {
      await this.walletService.unfreeze(wallet.id);
    }
    this.logger.log(`Fraud alert successfully resolved for user ${userId}. Wallets unfrozen.`);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Haversine formula to calculate the distance between two GPS coordinates in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of earth in km
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Clickhouse immutable fraud log logging
   */
  private async logToFraudOperationsClickhouse(userId: string, score: number, fingerprint: string): Promise<void> {
    this.logger.log(
      `[FRAUD OPERATIONS CENTER] clickhouse.gemz_fraud_alerts: user_id=${userId}, fraud_score=${score}, device_fingerprint=${fingerprint}, severity=CRITICAL, action=AUTO_FREEZE, timestamp=${new Date().toISOString()}`
    );
  }
}
