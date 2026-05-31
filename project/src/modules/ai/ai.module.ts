/**
 * ============================================================
 * AI Module - GEM Z v5.0
 * ============================================================
 * يدير الذكاء الاصطناعي في النظام:
 * - Coach: تخطيط التمارين والتغذية والتعافي
 * - Recommendation: توصيات الصالات والمدربين والمنتجات
 * - Retention: التنبؤ بالخروج واكتشاف الخمول
 * - Support: أتمتة التذاكر والأسئلة الشائعة
 * - Cost Router: تتبع التكاليف والاستخدام
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { AiCoachModule } from './coach/coach.module';
import { AiRecommendationModule } from './recommendation/recommendation.module';
import { AiRetentionModule } from './retention/retention.module';
import { AiSupportModule } from './support/support.module';
import { AiCostRouterModule } from './cost-router/cost-router.module';
import { AiBodyTransformationModule } from './body-transformation/body-transformation.module';
import { AiFraudNetworkModule } from './fraud/fraud-network.module';

@Module({
  imports: [
    AiCoachModule,
    AiRecommendationModule,
    AiRetentionModule,
    AiSupportModule,
    AiCostRouterModule,
    AiBodyTransformationModule,
    AiFraudNetworkModule,
  ],
  exports: [
    AiCoachModule,
    AiRecommendationModule,
    AiRetentionModule,
    AiSupportModule,
    AiCostRouterModule,
    AiBodyTransformationModule,
    AiFraudNetworkModule,
  ],
})
export class AiModule {}
