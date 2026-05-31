import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { FXModule } from './fx/fx.module';
import { EscrowModule } from './escrow/escrow.module';
import { RewardsModule } from './rewards/rewards.module';
import { PaymentsModule } from './payments/payments.module';

/**
 * وحدة الاقتصاد الرئيسية - Economy Module
 * 
 * تجمع جميع الوحدات المالية:
 * - Wallet: محافظ متعددة العملات + محاسبة مزدوجة
 * - FX: محرك صرف العملات
 * - Escrow: نظام الضمان
 * - Rewards: نقاط GEM + كاش باك
 * - Payments: مجمع بوابات الدفع
 */
@Module({
  imports: [WalletModule, FXModule, EscrowModule, RewardsModule, PaymentsModule],
  exports: [WalletModule, FXModule, EscrowModule, RewardsModule, PaymentsModule],
})
export class EconomyModule {}
