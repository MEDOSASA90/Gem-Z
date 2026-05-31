/**
 * ============================================================
 * Ads Module - GEM Z v5.0
 * ============================================================
 * يدير الحملات الإعلانية في النظام:
 * - Campaign: إنشاء الحملات وتوزيع الميزانية والاستهداف
 * - Ad: صالات رياضية ومدربون ومنتجات وتحديات مدعومة
 * - Analytics: انطباعات ونقرات ومعدلات تحويل
 * - Slot: خانات إعلانية ديناميكية
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { AdsCampaignModule } from './campaign/campaign.module';
import { AdsCreativeModule } from './ad/ad.module';
import { AdsAnalyticsModule } from './analytics/analytics.module';
import { AdsSlotModule } from './slot/slot.module';

@Module({
  imports: [
    AdsCampaignModule,
    AdsCreativeModule,
    AdsAnalyticsModule,
    AdsSlotModule,
  ],
  exports: [
    AdsCampaignModule,
    AdsCreativeModule,
    AdsAnalyticsModule,
    AdsSlotModule,
  ],
})
export class AdsModule {}
