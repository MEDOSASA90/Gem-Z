import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './wallet.entity';
import { Transaction } from './transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { TaxComplianceService } from '../tax-compliance.service';
import {
  WalletRepository,
  TransactionRepository,
  LedgerRepository,
} from './wallet.repository';

/**
 * وحدة المحفظة - Wallet Module
 * 
 * توفر خدمات إدارة المحافظ متعددة العملات مع:
 * - Redis distributed locks لكل عملية
 * - Double-entry ledger للمحاسبة المزدوجة
 * - Snapshots كل 50 حدث
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, LedgerEntry]),
    RedisModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    TaxComplianceService,
    WalletRepository,
    TransactionRepository,
    LedgerRepository,
  ],
  exports: [WalletService, TaxComplianceService, WalletRepository, TransactionRepository, LedgerRepository],
})
export class WalletModule {}
