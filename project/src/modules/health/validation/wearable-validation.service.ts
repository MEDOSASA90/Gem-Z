import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GlobalConfigService } from '../../../core/global-config/global-config.service';

export interface WearableSyncDto {
  userId: string;
  source: 'HEALTHKIT' | 'HEALTH_CONNECT' | 'GARMIN' | 'FITBIT';
  steps: number;
  calories: number;
  durationMinutes: number;
  deviceFingerprint: string;
  isEmulator?: boolean;
  hasMockGPS?: boolean;
  hasMockSensors?: boolean;
  averageVelocityKmh?: number;
}

@Injectable()
export class WearableValidationService {
  private readonly logger = new Logger(WearableValidationService.name);

  constructor(
    private readonly config: GlobalConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Validate wearable synchronization payload for Move-to-Earn security
   */
  async validateSync(dto: WearableSyncDto): Promise<{ isTrustworthy: boolean; trustScore: number; reason?: string }> {
    this.logger.log(`Validating wearable sync for user [${dto.userId}] from [${dto.source}]`);

    // 1. Reject instantly if emulator or mocked elements are explicitly detected by device service
    if (dto.isEmulator) {
      return { isTrustworthy: false, trustScore: 0, reason: 'EMULATOR_DETECTED' };
    }
    if (dto.hasMockGPS) {
      return { isTrustworthy: false, trustScore: 0, reason: 'MOCK_GPS_DETECTED' };
    }
    if (dto.hasMockSensors) {
      return { isTrustworthy: false, trustScore: 10, reason: 'MOCK_SENSORS_DETECTED' };
    }

    // 2. Perform Velocity Check (e.g. Reject walking/running activities exceeding 20 km/h)
    const maxVelocity = await this.config.getNumber('m2e_max_velocity_kmh', 20.0);
    if (dto.averageVelocityKmh && dto.averageVelocityKmh > maxVelocity) {
      this.logger.warn(`Velocity check failed: user speed is ${dto.averageVelocityKmh} km/h (limit: ${maxVelocity})`);
      return { isTrustworthy: false, trustScore: 15, reason: 'EXCESSIVE_VELOCITY' };
    }

    // 3. Consistency checks: Steps per minute check
    const stepsPerMinute = dto.steps / (dto.durationMinutes || 1);
    const maxStepsPerMinute = await this.config.getNumber('m2e_max_steps_per_minute', 300);
    if (stepsPerMinute > maxStepsPerMinute) {
      this.logger.warn(`Anomaly check failed: user steps per minute is ${stepsPerMinute} (limit: ${maxStepsPerMinute})`);
      return { isTrustworthy: false, trustScore: 20, reason: 'ABNORMAL_STEP_FREQUENCY' };
    }

    // Determine trust score
    let trustScore = 100;
    if (dto.source === 'FITBIT' || dto.source === 'GARMIN') {
      trustScore = 95; // Third-party cloud integration (highly trusted)
    } else {
      trustScore = 90; // Direct device sync
    }

    // Emit event on successful validation
    this.eventEmitter.emit('health.activity_validated', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: dto.userId,
      source_module: 'health',
      event_type: 'ActivityValidated',
      timestamp: new Date().toISOString(),
      payload: {
        userId: dto.userId,
        steps: dto.steps,
        calories: dto.calories,
        isTrustworthy: true,
        trustScore,
      },
    });

    return { isTrustworthy: true, trustScore };
  }
}
