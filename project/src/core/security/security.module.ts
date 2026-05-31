/**
 * =============================================================================
 * SecurityModule - موديول الأمان
 * =============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeviceService } from './device.service';
import { FraudService } from './fraud.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DeviceService, FraudService, RateLimitService],
  exports: [DeviceService, FraudService, RateLimitService],
})
export class SecurityModule {}
