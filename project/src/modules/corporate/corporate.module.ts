/**
 * ============================================================
 * Corporate Module - GEM Z v5.0
 * ============================================================
 * يدير الشركات والموظفين والتحديات:
 * - Company: الشركات والأقسام والموظفين ومديري الموارد البشرية
 * - Dashboard: صحة الموظفين والمشاركة والتحديات
 * - Challenge: تحديات خطوات وتحديات فريقية
 * - Wellness: تقييم النشاط والمشاركة والحضور
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { CorporateCompanyModule } from './company/company.module';
import { CorporateDashboardModule } from './dashboard/dashboard.module';
import { CorporateChallengeModule } from './challenge/challenge.module';
import { CorporateWellnessModule } from './wellness/wellness.module';

@Module({
  imports: [
    CorporateCompanyModule,
    CorporateDashboardModule,
    CorporateChallengeModule,
    CorporateWellnessModule,
  ],
  exports: [
    CorporateCompanyModule,
    CorporateDashboardModule,
    CorporateChallengeModule,
    CorporateWellnessModule,
  ],
})
export class CorporateModule {}
