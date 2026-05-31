/**
 * =============================================================================
 * Payout Module - موديول المدفوعات
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { CreatorPayout } from './creator-payout.entity';
import { RevenueSplit } from './revenue-split.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreatorPayout, RevenueSplit])],
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService],
})
export class PayoutModule {}
