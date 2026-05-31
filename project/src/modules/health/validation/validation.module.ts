import { Module } from '@nestjs/common';
import { WearableValidationService } from './wearable-validation.service';
import { ActivityValidationService } from './activity-validation.service';
import { ActivityValidationController } from './activity-validation.controller';
import { WalletModule } from '../../economy/wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [ActivityValidationController],
  providers: [WearableValidationService, ActivityValidationService],
  exports: [WearableValidationService, ActivityValidationService],
})
export class HealthValidationModule {}
