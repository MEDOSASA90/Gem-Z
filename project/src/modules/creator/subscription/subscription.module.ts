/**
 * =============================================================================
 * Subscription Module - موديول الاشتراكات
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlan } from './subscription-plan.entity';
import { CreatorSubscription } from './creator-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, CreatorSubscription])],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
