import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Wallet } from './wallet.entity';
import { Transaction } from './transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import {
  WalletRepository,
  TransactionRepository,
  LedgerRepository,
} from './wallet.repository';
import {
  Currency,
  WalletStatus,
  WalletType,
  TransactionType,
  TransactionStatus,
  LedgerEntryType,
} from '../../../common/enums';

/** مدة قفل Redis بالمللي ثانية (30 ثانية) */
const LOCK_TTL_MS = 30000;
/** المدة القصوى لانتظار القفل (10 ثواني) */
const LOCK_TIMEOUT_MS = 10000;
/** عدد الأحداث قبل إنشاء لقطة */
const SNAPSHOT_INTERVAL = 50;

/**
 * خدمة المحفظة - العمليات المالية الأساسية
 * Wallet Service - Core financial operations
 * 
 * كل عملية تستخدم Redis distributed lock لمنع العمليات المتزامنة
 * Every operation uses Redis distributed lock to prevent concurrent modifications
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: WalletRepository,
    @InjectRepository(Transaction)
    private readonly txRepo: TransactionRepository,
    private readonly ledgerRepo: LedgerRepository,
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =========================================================================
  // Helper: Distributed Lock
  // =========================================================================

  /**
   * الحصول على قفل Redis موزع
   * Acquire a Redis distributed lock using SET NX EX
   */
  private async acquireLock(lockKey: string, ttlMs: number = LOCK_TTL_MS): Promise<boolean> {
    const acquired = await this.redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    return acquired === 'OK';
  }

  /**
   * تحرير قفل Redis
   * Release a Redis distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  /**
   * تنفيذ عملية مع قفل (مع إعادة المحاولة)
   */
  private async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    timeoutMs: number = LOCK_TIMEOUT_MS,
  ): Promise<T> {
    const startTime = Date.now();
    let acquired = false;

    // محاولة الحصول على القفل مع إعادة المحاولة
    while (!acquired && Date.now() - startTime < timeoutMs) {
      acquired = await this.acquireLock(lockKey);
      if (!acquired) {
        await new Promise((r) => setTimeout(r, 100)); // انتظار 100ms قبل إعادة المحاولة
      }
    }

    if (!acquired) {
      throw new ConflictException(
        `تعذر الحصول على القفل: ${lockKey} - العملية قيد التنفيذ من قبل طلب آخر`,
      );
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * توليد مفتاح القفل للمحفظة
   */
  private walletLockKey(walletId: string): string {
    return `lock:wallet:${walletId}`;
  }

  // =========================================================================
  // Wallet CRUD
  // =========================================================================

  /**
   * إنشاء محفظة جديدة للمستخدم
   * Create a new wallet for a user with specified currency
   */
  async create(
    userId: string,
    currency: Currency,
    type: WalletType = WalletType.CONSUMER,
  ): Promise<Wallet> {
    // التحقق من عدم وجود محفظة بنفس العملة
    const existing = await this.walletRepo.findByUserAndCurrency(userId, currency);
    if (existing) {
      throw new ConflictException(
        `المستخدم لديه محفظة ${currency} بالفعل`,
      );
    }

    const wallet = await this.walletRepo.createWallet(userId, currency, type);

    // نشر حدث إنشاء المحفظة
    this.eventEmitter.emit('wallet.created', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: userId,
      source_module: 'economy',
      event_type: 'WalletCreated',
      timestamp: new Date().toISOString(),
      payload: {
        wallet_id: wallet.id,
        user_id: userId,
        currency,
        type,
      },
    });

    this.logger.log(`Wallet created: ${wallet.id} for user ${userId} (${currency})`);
    return wallet;
  }

  /**
   * الحصول على رصيد المحفظة
   * Get wallet balance including held amount
   */
  async getBalance(walletId: string): Promise<{
    balance: number;
    held_balance: number;
    available_balance: number;
    currency: Currency;
  }> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('المحفظة غير موجودة');
    }

    return {
      balance: wallet.balance,
      held_balance: wallet.held_balance,
      available_balance: wallet.availableBalance,
      currency: wallet.currency,
    };
  }

  /**
   * إيجاد محافظ المستخدم
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findByUserId(userId);
  }

  /**
   * إيجاد محفظة المستخدم بعملة محددة
   */
  async getUserWalletByCurrency(
    userId: string,
    currency: Currency,
  ): Promise<Wallet | null> {
    return this.walletRepo.findByUserAndCurrency(userId, currency);
  }

  // =========================================================================
  // Deposit
  // =========================================================================

  /**
   * إيداع مبلغ في المحفظة
   * Deposit funds into a wallet
   * 
   * CRITICAL: يستخدم Redis lock + double-entry ledger
   */
  async deposit(
    walletId: string,
    amount: number,
    referenceId: string | null = null,
    referenceType: string | null = null,
    description: string = 'إيداع',
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }

    const lockKey = this.walletLockKey(walletId);

    return this.withLock(lockKey, async () => {
      // استخدام transaction لضمان الذرية
      return this.dataSource.transaction(async (manager) => {
        const walletRepo = manager.getRepository(Wallet);
        const txRepo = manager.getRepository(Transaction);
        const ledgerRepo = manager.getRepository(LedgerEntry);

        // 1. جلب المحفظة مع تأمين صف
        const wallet = await walletRepo.findOne({
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
        if (wallet.status === WalletStatus.SUSPENDED) {
          throw new BadRequestException('المحفظة موقوفة - لا يمكن الإيداع');
        }

        const newBalance = wallet.balance + amount;

        // 2. تحديث الرصيد
        await walletRepo.increment({ id: walletId }, 'balance', amount);

        // 3. إنشاء معاملة
        const transaction = txRepo.create({
          wallet_id: walletId,
          type: TransactionType.CREDIT,
          amount,
          currency: wallet.currency,
          description,
          reference_id: referenceId,
          reference_type: referenceType,
          balance_after: newBalance,
          status: TransactionStatus.COMPLETED,
          metadata: { source: 'deposit' },
        });
        const savedTx = await txRepo.save(transaction);

        // 4. إنشاء قيدي دفتر مزدوجين (المحاسبة المزدوجة)
        // مدين: revenue:deposit (الإيرادات)
        // دائن: wallet:{id} (المحفظة)
        await ledgerRepo.save([
          ledgerRepo.create({
            transaction_id: savedTx.id,
            entry_type: LedgerEntryType.DEBIT,
            account: `revenue:deposit`,
            amount,
            currency: wallet.currency,
            description: `إيداح في محفظة ${walletId}`,
          }),
          ledgerRepo.create({
            transaction_id: savedTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `wallet:${walletId}`,
            amount,
            currency: wallet.currency,
            description: `إيداح في محفظة ${walletId}`,
          }),
        ]);

        // 5. تحديث نسخة اللقطة كل 50 حدث
        await this.checkAndCreateSnapshot(walletId, wallet.snapshot_version);

        // 6. نشر حدث
        this.eventEmitter.emit('wallet.credited', {
          event_id: crypto.randomUUID(),
          correlation_id: crypto.randomUUID(),
          actor_id: wallet.user_id,
          source_module: 'economy',
          event_type: 'WalletCredited',
          timestamp: new Date().toISOString(),
          payload: {
            wallet_id: walletId,
            user_id: wallet.user_id,
            transaction_id: savedTx.id,
            amount,
            currency: wallet.currency,
            new_balance: newBalance,
          },
        });

        this.logger.log(
          `Deposit: +${amount} ${wallet.currency} to wallet ${walletId} | Tx: ${savedTx.id}`,
        );

        return savedTx;
      });
    });
  }

  // =========================================================================
  // Withdraw
  // =========================================================================

  /**
   * سحب مبلغ من المحفظة
   * Withdraw funds from a wallet
   * 
   * CRITICAL: يتحقق من الرصيد الكافي + Redis lock + double-entry ledger
   */
  async withdraw(
    walletId: string,
    amount: number,
    referenceId: string | null = null,
    referenceType: string | null = null,
    description: string = 'سحب',
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }

    const lockKey = this.walletLockKey(walletId);

    return this.withLock(lockKey, async () => {
      return this.dataSource.transaction(async (manager) => {
        const walletRepo = manager.getRepository(Wallet);
        const txRepo = manager.getRepository(Transaction);
        const ledgerRepo = manager.getRepository(LedgerEntry);

        // 1. جلب المحفظة مع تأمين صف
        const wallet = await walletRepo.findOne({
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
        if (wallet.status !== WalletStatus.ACTIVE) {
          throw new BadRequestException('المحفظة غير نشطة - لا يمكن السحب');
        }

        // 2. التحقق من الرصيد الكافي
        if (!wallet.hasSufficientBalance(amount)) {
          throw new BadRequestException(
            `رصيد غير كافٍ: المتاح ${wallet.availableBalance.toFixed(4)}، المطلوب ${amount.toFixed(4)}`,
          );
        }

        const newBalance = wallet.balance - amount;

        // 3. تحديث الرصيد
        await walletRepo.decrement({ id: walletId }, 'balance', amount);

        // 4. إنشاء معاملة
        const transaction = txRepo.create({
          wallet_id: walletId,
          type: TransactionType.DEBIT,
          amount,
          currency: wallet.currency,
          description,
          reference_id: referenceId,
          reference_type: referenceType,
          balance_after: newBalance,
          status: TransactionStatus.COMPLETED,
          metadata: { source: 'withdrawal' },
        });
        const savedTx = await txRepo.save(transaction);

        // 5. إنشاء قيدي دفتر مزدوجين
        // مدين: wallet:{id} (المحفظة تُخصم)
        // دائن: liability:withdrawal (الالتزامات)
        await ledgerRepo.save([
          ledgerRepo.create({
            transaction_id: savedTx.id,
            entry_type: LedgerEntryType.DEBIT,
            account: `wallet:${walletId}`,
            amount,
            currency: wallet.currency,
            description: `سحب من محفظة ${walletId}`,
          }),
          ledgerRepo.create({
            transaction_id: savedTx.id,
            entry_type: LedgerEntryType.CREDIT,
            account: `liability:withdrawal`,
            amount,
            currency: wallet.currency,
            description: `سحب من محفظة ${walletId}`,
          }),
        ]);

        // 6. تحديث اللقطة
        await this.checkAndCreateSnapshot(walletId, wallet.snapshot_version);

        // 7. نشر حدث
        this.eventEmitter.emit('wallet.debited', {
          event_id: crypto.randomUUID(),
          correlation_id: crypto.randomUUID(),
          actor_id: wallet.user_id,
          source_module: 'economy',
          event_type: 'WalletDebited',
          timestamp: new Date().toISOString(),
          payload: {
            wallet_id: walletId,
            user_id: wallet.user_id,
            transaction_id: savedTx.id,
            amount,
            currency: wallet.currency,
            new_balance: newBalance,
          },
        });

        this.logger.log(
          `Withdraw: -${amount} ${wallet.currency} from wallet ${walletId} | Tx: ${savedTx.id}`,
        );

        return savedTx;
      });
    });
  }

  // =========================================================================
  // Transfer
  // =========================================================================

  /**
   * تحويل مبلغ بين محفظتين
   * Transfer funds between two wallets
   * 
   * CRITICAL: يقفل المحفظتين بترتيب لمنع الDeadlock + عملية ذرية
   */
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    description: string = 'تحويل',
  ): Promise<{ debitTx: Transaction; creditTx: Transaction }> {
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }
    if (fromWalletId === toWalletId) {
      throw new BadRequestException('لا يمكن التحويل لنفس المحفظة');
    }

    // ترتيب أقفال المحافظ لمنع Deadlock (lexicographic order)
    const lockKeys = [fromWalletId, toWalletId].sort().map((id) => this.walletLockKey(id));

    return this.withLock(lockKeys[0], async () => {
      return this.withLock(lockKeys[1], async () => {
        return this.dataSource.transaction(async (manager) => {
          const walletRepo = manager.getRepository(Wallet);
          const txRepo = manager.getRepository(Transaction);
          const ledgerRepo = manager.getRepository(LedgerEntry);

          // 1. جلب المحفظتين مع تأمين صف
          const [fromWallet, toWallet] = await Promise.all([
            walletRepo.findOne({
              where: { id: fromWalletId },
              lock: { mode: 'pessimistic_write' },
            }),
            walletRepo.findOne({
              where: { id: toWalletId },
              lock: { mode: 'pessimistic_write' },
            }),
          ]);

          if (!fromWallet) throw new NotFoundException('محفظة المصدر غير موجودة');
          if (!toWallet) throw new NotFoundException('محفظة الوجهة غير موجودة');

          if (fromWallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('محفظة المصدر غير نشطة');
          }
          if (toWallet.status === WalletStatus.SUSPENDED) {
            throw new BadRequestException('محفظة الوجهة موقوفة');
          }

          // 2. التحقق من العملة
          if (fromWallet.currency !== toWallet.currency) {
            throw new BadRequestException(
              `عملات مختلفة: ${fromWallet.currency} vs ${toWallet.currency} - استخدم صرف العملات`,
            );
          }

          // 3. التحقق من الرصيد الكافي
          if (!fromWallet.hasSufficientBalance(amount)) {
            throw new BadRequestException(
              `رصيد غير كافٍ: المتاح ${fromWallet.availableBalance.toFixed(4)}`,
            );
          }

          const fromNewBalance = fromWallet.balance - amount;
          const toNewBalance = toWallet.balance + amount;

          // 4. تحديث الرصيدين
          await walletRepo.decrement({ id: fromWalletId }, 'balance', amount);
          await walletRepo.increment({ id: toWalletId }, 'balance', amount);

          // 5. إنشاء معاملتين (سحب من المصدر + إيداع في الوجهة)
          const transferRefId = crypto.randomUUID();

          const debitTx = txRepo.create({
            wallet_id: fromWalletId,
            type: TransactionType.TRANSFER,
            amount,
            currency: fromWallet.currency,
            description: `${description} (إلى محفظة ${toWalletId})`,
            reference_id: transferRefId,
            reference_type: 'wallet_transfer',
            balance_after: fromNewBalance,
            status: TransactionStatus.COMPLETED,
            metadata: { direction: 'out', to_wallet: toWalletId },
          });

          const creditTx = txRepo.create({
            wallet_id: toWalletId,
            type: TransactionType.TRANSFER,
            amount,
            currency: toWallet.currency,
            description: `${description} (من محفظة ${fromWalletId})`,
            reference_id: transferRefId,
            reference_type: 'wallet_transfer',
            balance_after: toNewBalance,
            status: TransactionStatus.COMPLETED,
            metadata: { direction: 'in', from_wallet: fromWalletId },
          });

          const [savedDebit, savedCredit] = await txRepo.save([debitTx, creditTx]);

          // 6. إنشاء قيود دفتر مزدوجة
          // معاملة السحب: مدين wallet:from، دائن liability:transfer
          await ledgerRepo.save([
            ledgerRepo.create({
              transaction_id: savedDebit.id,
              entry_type: LedgerEntryType.DEBIT,
              account: `wallet:${fromWalletId}`,
              amount,
              currency: fromWallet.currency,
              description: `تحويل صادر: ${description}`,
            }),
            ledgerRepo.create({
              transaction_id: savedDebit.id,
              entry_type: LedgerEntryType.CREDIT,
              account: `liability:transfer`,
              amount,
              currency: fromWallet.currency,
              description: `تحويل صادر: ${description}`,
            }),
          ]);

          // معاملة الإيداع: مدين liability:transfer، دائن wallet:to
          await ledgerRepo.save([
            ledgerRepo.create({
              transaction_id: savedCredit.id,
              entry_type: LedgerEntryType.DEBIT,
              account: `liability:transfer`,
              amount,
              currency: toWallet.currency,
              description: `تحويل وارد: ${description}`,
            }),
            ledgerRepo.create({
              transaction_id: savedCredit.id,
              entry_type: LedgerEntryType.CREDIT,
              account: `wallet:${toWalletId}`,
              amount,
              currency: toWallet.currency,
              description: `تحويل وارد: ${description}`,
            }),
          ]);

          // 7. تحديث اللقطات
          await this.checkAndCreateSnapshot(fromWalletId, fromWallet.snapshot_version);
          await this.checkAndCreateSnapshot(toWalletId, toWallet.snapshot_version);

          // 8. نشر حدث
          this.eventEmitter.emit('wallet.transfer.completed', {
            event_id: crypto.randomUUID(),
            correlation_id: transferRefId,
            actor_id: fromWallet.user_id,
            source_module: 'economy',
            event_type: 'TransferCompleted',
            timestamp: new Date().toISOString(),
            payload: {
              from_wallet_id: fromWalletId,
              to_wallet_id: toWalletId,
              from_user_id: fromWallet.user_id,
              to_user_id: toWallet.user_id,
              amount,
              currency: fromWallet.currency,
              debit_transaction_id: savedDebit.id,
              credit_transaction_id: savedCredit.id,
            },
          });

          this.logger.log(
            `Transfer: ${amount} ${fromWallet.currency} from ${fromWalletId} to ${toWalletId} | Ref: ${transferRefId}`,
          );

          return { debitTx: savedDebit, creditTx: savedCredit };
        });
      });
    });
  }

  // =========================================================================
  // Freeze / Unfreeze
  // =========================================================================

  /**
   * تجميد المحفظة
   * Freeze a wallet (no withdrawals allowed)
   */
  async freeze(walletId: string, reason: string): Promise<void> {
    const lockKey = this.walletLockKey(walletId);

    await this.withLock(lockKey, async () => {
      const wallet = await this.walletRepo.findById(walletId);
      if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
      if (wallet.status === WalletStatus.SUSPENDED) {
        throw new BadRequestException('لا يمكن تجميد محفظة موقوفة');
      }

      await this.walletRepo.freeze(walletId);

      this.eventEmitter.emit('wallet.frozen', {
        event_id: crypto.randomUUID(),
        correlation_id: crypto.randomUUID(),
        actor_id: wallet.user_id,
        source_module: 'economy',
        event_type: 'WalletFrozen',
        timestamp: new Date().toISOString(),
        payload: { wallet_id: walletId, reason },
      });

      this.logger.log(`Wallet frozen: ${walletId} | Reason: ${reason}`);
    });
  }

  /**
   * فك تجميد المحفظة
   * Unfreeze a wallet (restore to ACTIVE)
   */
  async unfreeze(walletId: string): Promise<void> {
    const lockKey = this.walletLockKey(walletId);

    await this.withLock(lockKey, async () => {
      const wallet = await this.walletRepo.findById(walletId);
      if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
      if (wallet.status !== WalletStatus.FROZEN) {
        throw new BadRequestException('المحفظة غير مجمدة');
      }

      await this.walletRepo.unfreeze(walletId);

      this.eventEmitter.emit('wallet.unfrozen', {
        event_id: crypto.randomUUID(),
        correlation_id: crypto.randomUUID(),
        actor_id: wallet.user_id,
        source_module: 'economy',
        event_type: 'WalletUnfrozen',
        timestamp: new Date().toISOString(),
        payload: { wallet_id: walletId },
      });

      this.logger.log(`Wallet unfrozen: ${walletId}`);
    });
  }

  // =========================================================================
  // Transactions
  // =========================================================================

  /**
   * الحصول على معاملات محفظة مع تصفية
   */
  async getTransactions(
    walletId: string,
    filters: {
      type?: string;
      status?: string;
      reference_type?: string;
      from_date?: string;
      to_date?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [transactions, total] = await this.txRepo.findByWalletId(walletId, {
      ...filters,
      page,
      limit,
    });

    return { transactions, total, page, limit };
  }

  // =========================================================================
  // Snapshot
  // =========================================================================

  /**
   * التحقق وإنشاء لقطة كل 50 حدث
   */
  private async checkAndCreateSnapshot(
    walletId: string,
    currentVersion: number,
  ): Promise<void> {
    const newVersion = currentVersion + 1;
    if (newVersion % SNAPSHOT_INTERVAL === 0) {
      // إنشاء لقطة في Redis للاسترجاع السريع
      const wallet = await this.walletRepo.findById(walletId);
      if (wallet) {
        await this.redis.setex(
          `snapshot:wallet:${walletId}`,
          86400, // TTL 24 ساعة
          JSON.stringify({
            wallet_id: walletId,
            balance: wallet.balance,
            held_balance: wallet.held_balance,
            version: newVersion,
            timestamp: new Date().toISOString(),
          }),
        );
        await this.walletRepo.incrementSnapshotVersion(walletId);
        this.logger.log(`Snapshot created for wallet ${walletId} v${newVersion}`);
      }
    }
  }

  /**
   * الحصول على لقطة محفظة
   */
  async getSnapshot(walletId: string): Promise<Record<string, unknown> | null> {
    const snapshot = await this.redis.get(`snapshot:wallet:${walletId}`);
    return snapshot ? JSON.parse(snapshot) : null;
  }
}
