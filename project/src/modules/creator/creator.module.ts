/**
 * =============================================================================
 * Creator Module - موديول صناع المحتوى الرئيسي
 * =============================================================================
 * يجمع كل الموديولات الفرعية المتعلقة بصناع المحتوى:
 * - Profile: ملفات التعريف
 * - Subscription: الاشتراكات والخطط
 * - Program: البرامج التدريبية والغذائية
 * - Live: الجلسات المباشرة
 * - Payout: المدفوعات وتقسيم الإيرادات
 * - Dashboard: التحليلات ولوحة التحكم
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Profile
import { ProfileModule } from './profile/profile.module';
import { CreatorProfile } from './profile/creator-profile.entity';

// Subscription
import { SubscriptionModule } from './subscription/subscription.module';
import { SubscriptionPlan } from './subscription/subscription-plan.entity';
import { CreatorSubscription } from './subscription/creator-subscription.entity';

// Program
import { ProgramModule } from './program/program.module';
import { CreatorProgram } from './program/creator-program.entity';
import { ProgramEnrollment } from './program/program-enrollment.entity';

// Live
import { LiveModule } from './live/live.module';
import { LiveSession } from './live/live-session.entity';
import { LiveTicket } from './live/live-ticket.entity';
import { SessionReplay } from './live/session-replay.entity';

// Payout
import { PayoutModule } from './payout/payout.module';
import { CreatorPayout } from './payout/creator-payout.entity';
import { RevenueSplit } from './payout/revenue-split.entity';

// Dashboard
import { DashboardModule } from './dashboard/dashboard.module';
import { CreatorAnalytics } from './dashboard/creator-analytics.entity';

@Module({
  imports: [
    // تسجيل كل الـ entities في TypeORM
    TypeOrmModule.forFeature([
      CreatorProfile,
      SubscriptionPlan,
      CreatorSubscription,
      CreatorProgram,
      ProgramEnrollment,
      LiveSession,
      LiveTicket,
      SessionReplay,
      CreatorPayout,
      RevenueSplit,
      CreatorAnalytics,
    ]),
    // الموديولات الفرعية
    ProfileModule,
    SubscriptionModule,
    ProgramModule,
    LiveModule,
    PayoutModule,
    DashboardModule,
  ],
  exports: [
    // تصدير الموديولات الفرعية للاستخدام الخارجي
    ProfileModule,
    SubscriptionModule,
    ProgramModule,
    LiveModule,
    PayoutModule,
    DashboardModule,
    // تصدير الـ entities
    TypeOrmModule,
  ],
})
export class CreatorModule {}
