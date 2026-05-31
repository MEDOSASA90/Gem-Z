import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { CashbackService } from './cashback.service';
import { RewardsController } from './rewards.controller';
import { GEMPoints } from './points-balance.entity';
import { PointsTransaction } from './points-transaction.entity';
import { CashbackRule } from './cashback-rule.entity';
import { WalletModule } from '../wallet/wallet.module';

/**
 * وحدة المكافآت - Rewards Module
 * 
 * توفر:
 * - GEM Points: كسب وإنفاق وتحويل النقاط
 * - Cashback: حساب وإصدار الكاش باك
 * - قواعد مخصصة للكاش باك حسب الفئة
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([GEMPoints, PointsTransaction, CashbackRule]),
    WalletModule,
  ],
  controllers: [RewardsController],
  providers: [PointsService, CashbackService],
  exports: [PointsService, CashbackService],
})
export class RewardsModule {}
