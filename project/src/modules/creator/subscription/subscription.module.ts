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
import { ContentLockGuard } from './content-lock.guard';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, CreatorSubscription])],
  providers: [SubscriptionService, ContentLockGuard],
  controllers: [SubscriptionController],
  exports: [SubscriptionService, ContentLockGuard],
})
export class SubscriptionModule {}
