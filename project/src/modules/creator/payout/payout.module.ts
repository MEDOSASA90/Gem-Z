/**
 * =============================================================================
 * Payout Module - موديول المدفوعات
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { CreatorPayout } from './creator-payout.entity';
import { RevenueSplit } from './revenue-split.entity';

import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';
import { CreatorProfile } from '../profile/creator-profile.entity';
import { MonetizationService } from './monetization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreatorPayout,
      RevenueSplit,
      Wallet,
      Transaction,
      LedgerEntry,
      CreatorProfile,
    ]),
  ],
  providers: [PayoutService, MonetizationService],
  controllers: [PayoutController],
  exports: [PayoutService, MonetizationService],
})
export class PayoutModule {}
