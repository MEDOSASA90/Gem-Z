/**
 * =============================================================================
 * Dashboard Module - موديول لوحة التحكم
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CreatorAnalytics } from './creator-analytics.entity';
import { CreatorSubscription } from '../subscription/creator-subscription.entity';
import { RevenueSplit } from '../payout/revenue-split.entity';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreatorAnalytics,
      CreatorSubscription,
      RevenueSplit,
    ]),
    ProfileModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
