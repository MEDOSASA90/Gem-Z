import { Module } from '@nestjs/common';
import { WearableValidationService } from './wearable-validation.service';

@Module({
  imports: [],
  controllers: [],
  providers: [WearableValidationService],
  exports: [WearableValidationService],
})
export class HealthValidationModule {}
