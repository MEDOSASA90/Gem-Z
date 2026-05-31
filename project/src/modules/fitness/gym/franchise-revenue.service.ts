/**
 * =============================================================================
 * FranchiseRevenueService - محرك توزيع إيرادات الفروع والفرنشايز
 * =============================================================================
 * - يقوم بعملية تقسيم الدخل المتفرع ذرياً للفروع الرياضية تحت قفل موزع من Redis.
 * - يقرأ نسبة تقسيم الإيرادات المخصصة للفرع GymBranch (وتتراجع لـ 20% للمقر الرئيسي تلقائياً).
 * - يوجه حصة المقر الرئيسي (Master HQ) تلقائياً إلى محفظة المالك الرئيسي للجيم (MasterHQOwner).
 * - يوجه حصة الفرع الإقليمي المتبقية مباشرة إلى الرصيد المتاح القابل للسحب للفرع (WithdrawableBalance).
 * - يولد قيود مزدوجة مطابقة لدفتر الأستاذ المالي (Double-Entry Ledger).
 * - يطلق حدث FranchiseRevenueSplitCalculated لتوثيق وتصدير التسوية.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { GymBranch } from './branch.entity';
import { Gym } from './gym.entity';
import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';

import {
  Currency,
  WalletStatus,
  WalletType,
  TransactionType,
  TransactionStatus,
  LedgerEntryType,
} from '../../../common/enums';

@Injectable()
export class FranchiseRevenueService {
  private readonly logger = new Logger(FranchiseRevenueService.name);

  constructor(
    @InjectRepository(GymBranch)
    private readonly branchRepo: Repository<GymBranch>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * معالجة تقسيم الإيرادات لفرع الفرنشايز بشكل ذري
   */
  async processFranchiseRevenueSplit(
    branchId: string,
    traineeId: string,
    amount: number,
    currency: Currency,
    referenceType: string,
    referenceId: string,
  ): Promise<any> {
    const lockKey = `lock:franchise:${branchId}`;

    return this.withLock(lockKey, async () => {
      return this.dataSource.transaction(async (manager) => {
        const branchRepository = manager.getRepository(GymBranch);
        const walletRepository = manager.getRepository(Wallet);
        const txRepository = manager.getRepository(Transaction);
        const ledgerRepository = manager.getRepository(LedgerEntry);

        // 1. جلب الفرع الرياضي وقراءة الجيم الرئيسي المرتبط به لمعرفة المالك
        const branch = await branchRepository.findOne({
          where: { id: branchId },
          relations: ['gym'],
        });

        if (!branch) {
          throw new HttpException('Gym branch not found', HttpStatus.NOT_FOUND);
        }

        const parentGym = branch.gym;
        if (!parentGym) {
          throw new HttpException('Parent Gym (Master HQ) relationship is missing', HttpStatus.BAD_REQUEST);
        }

        const hqOwnerUserId = parentGym.owner_id;
        
        // استخراج معرف مشغل الفرع أو التراجع لمعرف افتراضي مميز للفرع
        const branchOperatorUserId = (branch.settings as any)?.operator_id || branchId;

        // قراءة نسبة تقسيم الأرباح للفرع (مثلاً 20.00% للمقر الرئيسي)
        const hqSplitRatio = branch.revenue_split_ratio !== undefined ? Number(branch.revenue_split_ratio) : 20.0;
        const hqAmount = (amount * hqSplitRatio) / 100;
        const branchAmount = amount - hqAmount;

        // 2. خصم كامل المبلغ من محفظة المتدرب
        const traineeWallet = await walletRepository.findOne({
          where: { user_id: traineeId, currency },
          lock: { mode: 'pessimistic_write' },
        });

        if (!traineeWallet) {
          throw new HttpException(`Trainee wallet for currency ${currency} not found`, HttpStatus.BAD_REQUEST);
        }

        if (Number(traineeWallet.balance) < amount) {
          throw new HttpException('Insufficient funds in trainee wallet', HttpStatus.BAD_REQUEST);
        }

        traineeWallet.balance = Number(traineeWallet.balance) - amount;
        await walletRepository.save(traineeWallet);

        const traineeTx = txRepository.create({
          wallet_id: traineeWallet.id,
          type: TransactionType.DEBIT,
          amount,
          currency,
          description: `Payment for dynamic membership/booking at franchise branch ${branch.name}`,
          balance_after: traineeWallet.balance,
          status: TransactionStatus.COMPLETED,
          reference_id: referenceId,
          reference_type: referenceType,
        });
        const savedTraineeTx = await txRepository.save(traineeTx);

        // 3. إيداع حصة المقر الرئيسي (HQ Owner) في محفظته الرئيسية (MasterHQOwner Wallet)
        let hqWallet = await walletRepository.findOne({
          where: { user_id: hqOwnerUserId, currency },
          lock: { mode: 'pessimistic_write' },
        });
        if (!hqWallet) {
          hqWallet = walletRepository.create({
            user_id: hqOwnerUserId,
            currency,
            balance: 0,
            held_balance: 0,
            status: WalletStatus.ACTIVE,
            type: WalletType.TREASURY,
          });
          hqWallet = await walletRepository.save(hqWallet);
        }

        hqWallet.balance = Number(hqWallet.balance) + hqAmount;
        await walletRepository.save(hqWallet);

        const hqTx = txRepository.create({
          wallet_id: hqWallet.id,
          type: TransactionType.CREDIT,
          amount: hqAmount,
          currency,
          description: `Franchise Master HQ ${hqSplitRatio}% revenue split from branch: ${branch.name}`,
          balance_after: hqWallet.balance,
          status: TransactionStatus.COMPLETED,
          reference_id: referenceId,
          reference_type: referenceType,
        });
        const savedHqTx = await txRepository.save(hqTx);

        // 4. إيداع حصة الفرع الإقليمي مباشرة كـ WithdrawableBalance للفرع
        let branchWallet = await walletRepository.findOne({
          where: { user_id: branchOperatorUserId, currency },
          lock: { mode: 'pessimistic_write' },
        });
        if (!branchWallet) {
          branchWallet = walletRepository.create({
            user_id: branchOperatorUserId,
            currency,
            balance: 0,
            held_balance: 0,
            status: WalletStatus.ACTIVE,
            type: WalletType.MERCHANT,
          });
          branchWallet = await walletRepository.save(branchWallet);
        }

        // إيداع مباشر للرصيد المتاح غير المجمد (WithdrawableBalance)
        branchWallet.balance = Number(branchWallet.balance) + branchAmount;
        await walletRepository.save(branchWallet);

        const branchTx = txRepository.create({
          wallet_id: branchWallet.id,
          type: TransactionType.CREDIT,
          amount: branchAmount,
          currency,
          description: `Regional branch franchise share from content/booking purchase`,
          balance_after: branchWallet.balance,
          status: TransactionStatus.COMPLETED,
          reference_id: referenceId,
          reference_type: referenceType,
        });
        const savedBranchTx = await txRepository.save(branchTx);

        // 5. إنشاء قيود أستاذ المحاسبة المزدوجة المتوازنة لتوثيق الحركات
        await ledgerRepository.save([
          ledgerRepository.create({
            transaction_id: savedTraineeTx.id,
            entry_type: LedgerEntryType.DEBIT,
            account: `wallet:${traineeWallet.id}`,
            amount,
            currency,
            description: `Deduction for franchise slot/membership checkout`,
          }),
          ledgerRepository.create({
            transaction_id: savedHqTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `wallet:hq:${hqWallet.id}`,
            amount: hqAmount,
            currency,
            description: `Corporate Master HQ split`,
          }),
          ledgerRepository.create({
            transaction_id: savedBranchTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `wallet:branch:${branchWallet.id}`,
            amount: branchAmount,
            currency,
            description: `Regional branch share credited directly to available balance`,
          }),
        ]);

        // 6. إطلاق حدث تفريغ الإيرادات الموزعة للفرنشايز
        this.eventEmitter.emit('FranchiseRevenueSplitCalculated', {
          branchId,
          hqOwnerUserId,
          branchOperatorUserId,
          grossAmount: amount,
          hqAmount,
          branchAmount,
          currency,
          referenceId,
          timestamp: new Date(),
        });

        this.logger.log(
          `Franchise Revenue Split processed for branch ${branchId}. HQ Share (${hqSplitRatio}%): ${hqAmount} | Branch Share: ${branchAmount} ${currency}`,
        );

        return {
          success: true,
          branchId,
          grossAmount: amount,
          hqSplitAmount: hqAmount,
          branchSplitAmount: branchAmount,
          hqOwnerUserId,
        };
      });
    });
  }

  // =========================================================================
  // Distributed Lock Helpers
  // =========================================================================

  private async acquireLock(lockKey: string, ttlMs: number = 30000): Promise<boolean> {
    const result = await this.redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  private async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
  ): Promise<T> {
    const startTime = Date.now();
    let acquired = false;

    while (!acquired && Date.now() - startTime < timeoutMs) {
      acquired = await this.acquireLock(lockKey);
      if (!acquired) {
        await new Promise((r) => setTimeout(r, 100)); // انتظار 100ms
      }
    }

    if (!acquired) {
      throw new HttpException(
        `Franchise Lock acquisition timed out for key: ${lockKey}`,
        HttpStatus.CONFLICT,
      );
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(lockKey);
    }
  }
}
