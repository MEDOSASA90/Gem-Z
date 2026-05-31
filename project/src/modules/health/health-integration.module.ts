/**
 * ============================================================
 * Health Integration Module - GEM Z v5.0
 * ============================================================
 * يدير تكامل البيانات الصحية:
 * - Sync: Apple HealthKit، Google Health Connect، Fitbit، Garmin
 * - Data: خطوات، نوم، نبض، سعرات، تمارين
 * - Validation: Move-to-Earn validation مع أولوية البيانات القابلة للارتداء
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { HealthSyncModule } from './sync/sync.module';
import { HealthDataModule } from './data/data.module';
import { HealthValidationModule } from './validation/validation.module';

@Module({
  imports: [
    HealthSyncModule,
    HealthDataModule,
    HealthValidationModule,
  ],
  exports: [
    HealthSyncModule,
    HealthDataModule,
    HealthValidationModule,
  ],
})
export class HealthIntegrationModule {}
