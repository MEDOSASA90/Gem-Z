/**
 * =============================================================================
 * MonetizationService - محرك تقسيم المدفوعات وجدولة تسويات الضمان
 * =============================================================================
 * - يقوم بعملية تقسيم الدفع ذرياً (Split-Payment) تحت قفل موزّع من Redis.
 * - يقتطع عمولة المنصة ديناميكياً بناءً على إعداد صانع المحتوى (تتراجع لـ 10% تلقائياً).
 * - يودع الـ 90% المتبقية في رصيد الضمان المعلق للمبدع (held_balance).
 * - يولد قيود مزدوجة مطابقة لدفتر الأستاذ المالي (Double-Entry Ledger).
 * - يجدول تحرير الضمان بعد 7 أيام تماماً باستخدام Redis Sorted Sets (ZSET).
 * - يقوم بفك القفل عن الأرباح ونقلها للرصيد المتاح القابل للسحب (available_balance) تلقائياً عبر وظيفة Cron.
 */

import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';
import { CreatorProfile } from '../profile/creator-profile.entity';
import { RevenueSplit, RevenueSourceType } from './revenue-split.entity';

import {
  Currency,
  WalletStatus,
  WalletType,
  TransactionType,
  TransactionStatus,
  LedgerEntryType,
} from '../../../common/enums';

@Injectable()
export class MonetizationService implements OnModuleInit {
  private readonly logger = new Logger(MonetizationService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(CreatorProfile)
    private readonly creatorRepo: Repository<CreatorProfile>,
    @InjectRepository(RevenueSplit)
    private readonly splitRepo: Repository<RevenueSplit>,
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Monetization & Escrow Settlement Engine Initialized');
  }

  // =========================================================================
  // Core Split-Payment Execution
  // =========================================================================

  /**
   * تنفيذ تقسيم المدفوعات ذرياً تحت قفل موزع من Redis لمنع الـ Race Conditions
   */
  async processSplitPayment(
    traineeId: string,
    creatorId: string,
    amount: number,
    currency: Currency,
    sourceType: RevenueSourceType,
    sourceId: string,
  ): Promise<any> {
    const lockKey = `lock:payout:${creatorId}`;

    return this.withLock(lockKey, async () => {
      return this.dataSource.transaction(async (manager) => {
        const walletRepository = manager.getRepository(Wallet);
        const txRepository = manager.getRepository(Transaction);
        const ledgerRepository = manager.getRepository(LedgerEntry);
        const creatorRepository = manager.getRepository(CreatorProfile);
        const splitRepository = manager.getRepository(RevenueSplit);

        // 1. جلب محفظة المتدرب مع قفل الصف (Pessimistic Write Lock)
        const traineeWallet = await walletRepository.findOne({
          where: { user_id: traineeId, currency },
          lock: { mode: 'pessimistic_write' },
        });

        if (!traineeWallet) {
          throw new HttpException(
            `Trainee wallet for currency ${currency} not found`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (Number(traineeWallet.balance) < amount) {
          throw new HttpException(
            'Insufficient funds in trainee wallet',
            HttpStatus.BAD_REQUEST,
          );
        }

        // 2. جلب ملف تعريف المبدع لمعرفة نسبة العمولة الخاصة به
        const creator = await creatorRepository.findOne({
          where: { id: creatorId },
        });
        if (!creator) {
          throw new HttpException(
            'Creator profile not found',
            HttpStatus.NOT_FOUND,
          );
        }

        // قراءة نسبة العمولة أو التراجع لنسبة 10% الافتراضية
        const commissionRate = creator.commission_rate !== undefined ? Number(creator.commission_rate) : 10.0;
        const platformAmount = (amount * commissionRate) / 100;
        const creatorAmount = amount - platformAmount;

        // 3. خصم قيمة الفاتورة كاملة من محفظة المتدرب
        traineeWallet.balance = Number(traineeWallet.balance) - amount;
        await walletRepository.save(traineeWallet);

        const traineeTx = txRepository.create({
          wallet_id: traineeWallet.id,
          type: TransactionType.DEBIT,
          amount,
          currency,
          description: `Purchase of ${sourceType} ${sourceId} hosted by creator ${creatorId}`,
          balance_after: traineeWallet.balance,
          status: TransactionStatus.COMPLETED,
          metadata: { source: 'monetization_purchase', traineeId },
        });
        const savedTraineeTx = await txRepository.save(traineeTx);

        // 4. إيداع الـ 10% مباشرة في محفظة أرباح المنصة (Platform Revenue Wallet)
        const SYSTEM_PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000';
        let platformWallet = await walletRepository.findOne({
          where: { user_id: SYSTEM_PLATFORM_USER_ID, currency },
          lock: { mode: 'pessimistic_write' },
        });
        if (!platformWallet) {
          platformWallet = walletRepository.create({
            user_id: SYSTEM_PLATFORM_USER_ID,
            currency,
            balance: 0,
            held_balance: 0,
            status: WalletStatus.ACTIVE,
            type: WalletType.TREASURY,
          });
          platformWallet = await walletRepository.save(platformWallet);
        }

        platformWallet.balance = Number(platformWallet.balance) + platformAmount;
        await walletRepository.save(platformWallet);

        const platformTx = txRepository.create({
          wallet_id: platformWallet.id,
          type: TransactionType.CREDIT,
          amount: platformAmount,
          currency,
          description: `Platform commission ${commissionRate}% from content sale: ${sourceType} ${sourceId}`,
          balance_after: platformWallet.balance,
          status: TransactionStatus.COMPLETED,
          metadata: { source: 'monetization_platform_fee', creatorId },
        });
        const savedPlatformTx = await txRepository.save(platformTx);

        // 5. إيداع الـ 90% المتبقية في حساب ضمان صانع المحتوى (تضاف للرصيد وتجمد في held_balance)
        let creatorWallet = await walletRepository.findOne({
          where: { user_id: creator.user_id, currency },
          lock: { mode: 'pessimistic_write' },
        });
        if (!creatorWallet) {
          creatorWallet = walletRepository.create({
            user_id: creator.user_id,
            currency,
            balance: 0,
            held_balance: 0,
            status: WalletStatus.ACTIVE,
            type: WalletType.MERCHANT,
          });
          creatorWallet = await walletRepository.save(creatorWallet);
        }

        creatorWallet.balance = Number(creatorWallet.balance) + creatorAmount;
        creatorWallet.held_balance = Number(creatorWallet.held_balance) + creatorAmount;
        await walletRepository.save(creatorWallet);

        const creatorTx = txRepository.create({
          wallet_id: creatorWallet.id,
          type: TransactionType.CREDIT,
          amount: creatorAmount,
          currency,
          description: `Creator share escrowed for 7 days: ${sourceType} ${sourceId}`,
          balance_after: creatorWallet.balance,
          status: TransactionStatus.COMPLETED,
          metadata: { source: 'monetization_creator_held', creatorId },
        });
        const savedCreatorTx = await txRepository.save(creatorTx);

        // 6. إنشاء القيود المزدوجة لتوثيق التحويلات المالية بشفافية كاملة
        await ledgerRepository.save([
          ledgerRepository.create({
            transaction_id: savedTraineeTx.id,
            entry_type: LedgerEntryType.DEBIT,
            account: `wallet:${traineeWallet.id}`,
            amount,
            currency,
            description: `Deduction for purchase of creator ${creatorId} content: ${sourceType} ${sourceId}`,
          }),
          ledgerRepository.create({
            transaction_id: savedPlatformTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `wallet:platform:${platformWallet.id}`,
            amount: platformAmount,
            currency,
            description: `Platform ${commissionRate}% commission fee credited`,
          }),
          ledgerRepository.create({
            transaction_id: savedCreatorTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `wallet:escrow:${creatorWallet.id}`,
            amount: creatorAmount,
            currency,
            description: `Creator share escrowed in held_balance`,
          }),
        ]);

        // 7. توثيق سجل الإيرادات
        const split = splitRepository.create({
          creator_id: creatorId,
          source_type: sourceType,
          source_id: sourceId,
          gross_amount: amount,
          platform_percentage: commissionRate,
          platform_amount: platformAmount,
          creator_amount: creatorAmount,
          currency,
          payment_transaction_id: savedTraineeTx.id,
          is_paid_out: false,
        });
        await splitRepository.save(split);

        // 8. جدولة تحرير الضمان بعد 7 أيام في Redis Sorted Set (ZSET)
        // في بيئة الاختبار والمحاكاة، يتم وضع epoch لـ 7 أيام في المستقبل
        const settlementTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const settlementPayload = {
          creatorId,
          creatorUserId: creator.user_id,
          walletId: creatorWallet.id,
          amount: creatorAmount,
          currency,
          purchaseId: sourceId,
          createdAt: new Date().toISOString(),
        };

        await this.redis.zadd(
          'payout:settlements',
          settlementTime,
          JSON.stringify(settlementPayload),
        );

        this.logger.log(
          `Successfully processed split payment. Trainee: ${traineeId} | Creator: ${creatorId} | Total: ${amount} ${currency} | Platform Split: ${platformAmount} | Creator Held Split: ${creatorAmount}`,
        );

        return {
          success: true,
          grossAmount: amount,
          platformCommission: platformAmount,
          creatorShareHeld: creatorAmount,
          settlementScheduledAt: new Date(settlementTime).toISOString(),
        };
      });
    });
  }

  // =========================================================================
  // 7-Day Escrow Settlement Scheduler
  // =========================================================================

  /**
   * وظيفة دورية تعمل كل دقيقة لقراءة ومعالجة الاستحقاقات وتسوية الضمان المعلق
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processSettlements(): Promise<void> {
    const now = Date.now();

    // جلب كل الاستحقاقات الناضجة (Mature Settlements)
    const matureSettlements = await this.redis.zrangebyscore(
      'payout:settlements',
      '-inf',
      now,
    );

    if (!matureSettlements || matureSettlements.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${matureSettlements.length} mature escrow payouts ready for release. Processing...`,
    );

    for (const settlementStr of matureSettlements) {
      let payload: any;
      try {
        payload = JSON.parse(settlementStr);
      } catch (err: any) {
        this.logger.error(
          `Failed to parse mature settlement record: ${settlementStr}`,
        );
        // مسح السجل الفاسد لتفادي التكرار اللانهائي
        await this.redis.zrem('payout:settlements', settlementStr);
        continue;
      }

      const { creatorId, walletId, amount, currency, purchaseId } = payload;
      const lockKey = `lock:payout:${creatorId}`;

      try {
        await this.withLock(lockKey, async () => {
          await this.dataSource.transaction(async (manager) => {
            const walletRepository = manager.getRepository(Wallet);
            const txRepository = manager.getRepository(Transaction);
            const ledgerRepository = manager.getRepository(LedgerEntry);

            // جلب محفظة المبدع بقفل الصف
            const wallet = await walletRepository.findOne({
              where: { id: walletId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!wallet) {
              throw new Error(`Creator wallet ${walletId} not found`);
            }

            if (Number(wallet.held_balance) < Number(amount)) {
              throw new Error(
                `Held balance mismatch in creator wallet ${walletId}. Required: ${amount}, Current held: ${wallet.held_balance}`,
              );
            }

            // تحرير الأموال من الرصيد المحجوز
            // تذكر أن الرصيد الفعلي المتاح هو: available = balance - held_balance
            // وبالتالي خصم الـ held_balance دون المساس بالـ balance الإجمالي
            // يحرر المبلغ تلقائياً ليصبح جزءاً من الرصيد القابل للسحب (available_balance)
            wallet.held_balance = Number(wallet.held_balance) - Number(amount);
            await walletRepository.save(wallet);

            // إنشاء سجل معاملة التحرير للتدقيق
            const releaseTx = txRepository.create({
              wallet_id: wallet.id,
              type: TransactionType.CREDIT,
              amount,
              currency,
              description: `Release of held escrow balance for purchase ${purchaseId} to withdrawable balance`,
              balance_after: wallet.balance,
              status: TransactionStatus.COMPLETED,
              metadata: { source: 'monetization_release', purchaseId },
            });
            const savedReleaseTx = await txRepository.save(releaseTx);

            // توثيق قيود الأستاذ المالي
            await ledgerRepository.save([
              ledgerRepository.create({
                transaction_id: savedReleaseTx.id,
                entry_type: LedgerEntryType.DEBIT,
                account: `wallet:escrow:${wallet.id}`,
                amount,
                currency,
                description: `Release of locked escrowed funds for purchase ${purchaseId}`,
              }),
              ledgerRepository.create({
                transaction_id: savedReleaseTx.id,
                entry_type: LedgerEntryType.CREDIT,
                account: `wallet:${wallet.id}`,
                amount,
                currency,
                description: `Credit to withdrawable available balance of creator`,
              }),
            ]);

            // إطلاق حدث Payout Settled للنظام بأكمله
            this.eventEmitter.emit('CreatorPayoutSettled', {
              creatorId,
              walletId,
              amount,
              currency,
              purchaseId,
              settledAt: new Date(),
            });

            this.logger.log(
              `Successfully settled and released ${amount} ${currency} to creator ${creatorId} for purchase ${purchaseId}`,
            );
          });
        });

        // إزالة بصمة التسوية بنجاح من الـ Sorted Set
        await this.redis.zrem('payout:settlements', settlementStr);
      } catch (err: any) {
        this.logger.error(
          `Failed to process mature payout settlement for creator ${creatorId}: ${err.message}`,
        );
      }
    }
  }

  // =========================================================================
  // Distributed Lock Helpers
  // =========================================================================

  private async acquireLock(
    lockKey: string,
    ttlMs: number = 30000,
  ): Promise<boolean> {
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
        `Monetization Lock acquisition timed out for key: ${lockKey}`,
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
