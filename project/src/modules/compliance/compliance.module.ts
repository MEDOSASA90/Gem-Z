/**
 * ============================================================
 * Compliance Module - GEM Z v5.0
 * ============================================================
 * يدير الامتثال والالتزام:
 * - GDPR: سياسات الاحتفاظ بالبيانات والحق في النسيان
 * - AML: مكافحة غسيل الأموال ورصد المعاملات
 * - VAT: حساب VAT لكل دولة (مصر، السعودية، الإمارات)
 * - Regional: قواعد خاصة بكل دولة بدون hardcoded logic
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { ComplianceGdprModule } from './gdpr/gdpr.module';
import { ComplianceAmlModule } from './aml/aml.module';
import { ComplianceVatModule } from './vat/vat.module';
import { ComplianceRegionalModule } from './regional/regional.module';

@Module({
  imports: [
    ComplianceGdprModule,
    ComplianceAmlModule,
    ComplianceVatModule,
    ComplianceRegionalModule,
  ],
  exports: [
    ComplianceGdprModule,
    ComplianceAmlModule,
    ComplianceVatModule,
    ComplianceRegionalModule,
  ],
})
export class ComplianceModule {}
