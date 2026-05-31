/**
 * ============================================================
 * Settlement Module - GEM Z v5.0
 * ============================================================
 * يدير التسويات والمدفوعات:
 * - Payout: مدفوعات لأصحاب الصالات والمدربين والمبدعين
 * - Settlement: إجمالي الإيرادات والضريبة والعمولة والصافي
 * - Withdrawal: سحب يدوي ومقرر وآلي
 * - Treasury: تسوية يومية للأرصدة
 * ============================================================
 */
import { Module } from '@nestjs/common';
import { SettlementPayoutModule } from './payout/payout.module';
import { SettlementCoreModule } from './settlement/settlement-core.module';
import { SettlementWithdrawalModule } from './withdrawal/withdrawal.module';
import { SettlementTreasuryModule } from './treasury/treasury.module';

@Module({
  imports: [
    SettlementPayoutModule,
    SettlementCoreModule,
    SettlementWithdrawalModule,
    SettlementTreasuryModule,
  ],
  exports: [
    SettlementPayoutModule,
    SettlementCoreModule,
    SettlementWithdrawalModule,
    SettlementTreasuryModule,
  ],
})
export class SettlementModule {}
