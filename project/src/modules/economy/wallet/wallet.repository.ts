import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Wallet } from './wallet.entity';
import { Transaction } from './transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { Currency, WalletStatus, WalletType, LedgerEntryType, TransactionStatus } from '../../../common/enums';

/**
 * مستودع المحافظ - عمليات قاعدة البيانات للمحافظ
 * Wallet Repository - Database operations for wallets
 */
@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(private dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }

  /**
   * إيجاد محفظة بالمعرف مع تأمين صف (pessimistic lock)
   */
  async findByIdWithLock(id: string): Promise<Wallet | null> {
    return this.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * إيجاد محفظة بالمعرف بدون تأمين
   */
  async findById(id: string): Promise<Wallet | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * إيجاد محافظ مستخدم
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    return this.find({
      where: { user_id: userId },
      order: { currency: 'ASC' },
    });
  }

  /**
   * إيجاد محفظة لمستخدم بعملة محددة
   */
  async findByUserAndCurrency(
    userId: string,
    currency: Currency,
  ): Promise<Wallet | null> {
    return this.findOne({
      where: { user_id: userId, currency },
    });
  }

  /**
   * إنشاء محفظة جديدة
   */
  async createWallet(
    userId: string,
    currency: Currency,
    type: WalletType = WalletType.CONSUMER,
  ): Promise<Wallet> {
    const wallet = this.create({
      user_id: userId,
      currency,
      type,
      balance: 0,
      held_balance: 0,
      status: WalletStatus.ACTIVE,
      snapshot_version: 0,
    });
    return this.save(wallet);
  }

  /**
   * تحديث رصيد المحفظة (زيادة)
   */
  async incrementBalance(walletId: string, amount: number): Promise<void> {
    await this.increment({ id: walletId }, 'balance', amount);
  }

  /**
   * تحديث رصيد المحفظة (نقصان)
   */
  async decrementBalance(walletId: string, amount: number): Promise<void> {
    await this.decrement({ id: walletId }, 'balance', amount);
  }

  /**
   * تحديث الرصيد المحجوز
   */
  async incrementHeldBalance(walletId: string, amount: number): Promise<void> {
    await this.increment({ id: walletId }, 'held_balance', amount);
  }

  async decrementHeldBalance(walletId: string, amount: number): Promise<void> {
    await this.decrement({ id: walletId }, 'held_balance', amount);
  }

  /**
   * تجميد المحفظة
   */
  async freeze(walletId: string): Promise<void> {
    await this.update(walletId, { status: WalletStatus.FROZEN });
  }

  /**
   * فك تجميد المحفظة
   */
  async unfreeze(walletId: string): Promise<void> {
    await this.update(walletId, { status: WalletStatus.ACTIVE });
  }

  /**
   * التحقق من وجود محفظة نشطة
   */
  async isActive(walletId: string): Promise<boolean> {
    const count = await this.count({
      where: { id: walletId, status: WalletStatus.ACTIVE },
    });
    return count > 0;
  }

  /**
   * زيادة نسخة اللقطة
   */
  async incrementSnapshotVersion(walletId: string): Promise<void> {
    await this.increment({ id: walletId }, 'snapshot_version', 1);
  }
}

/**
 * مستودع المعاملات
 * Transaction Repository
 */
@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  /**
   * إنشاء معاملة جديدة
   */
  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.create(data);
    return this.save(transaction);
  }

  /**
   * إيجاد معاملة بالمعرف
   */
  async findById(id: string): Promise<Transaction | null> {
    return this.findOne({
      where: { id },
      relations: ['ledger_entries'],
    });
  }

  /**
   * إيجاد معاملات محفظة مع تصفية
   */
  async findByWalletId(
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
  ): Promise<[Transaction[], number]> {
    const {
      type,
      status,
      reference_type,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = filters;

    const qb = this.createQueryBuilder('tx')
      .where('tx.wallet_id = :walletId', { walletId })
      .orderBy('tx.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('tx.type = :type', { type });
    if (status) qb.andWhere('tx.status = :status', { status });
    if (reference_type) qb.andWhere('tx.reference_type = :referenceType', { referenceType: reference_type });
    if (from_date) qb.andWhere('tx.created_at >= :fromDate', { fromDate: new Date(from_date) });
    if (to_date) qb.andWhere('tx.created_at <= :toDate', { toDate: new Date(to_date) });

    return qb.getManyAndCount();
  }

  /**
   * إيجاد معاملة بالمرجع
   */
  async findByReference(
    referenceId: string,
    referenceType: string,
  ): Promise<Transaction[]> {
    return this.find({
      where: { reference_id: referenceId, reference_type: referenceType },
    });
  }

  /**
   * تحديث حالة المعاملة
   */
  async updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (metadata) {
      updateData.metadata = () => `metadata || '${JSON.stringify(metadata)}'::jsonb`;
    }
    await this.update(id, updateData);
  }

  /**
   * عكس حالة المعاملة
   */
  async markReversed(id: string, reason: string): Promise<void> {
    await this.update(id, {
      status: TransactionStatus.REVERSED,
      metadata: () => `metadata || '{"reversed": true, "reversed_reason": "${reason}"}'::jsonb`,
    });
  }
}

/**
 * مستودع قيود الدفتر
 * Ledger Entry Repository
 */
@Injectable()
export class LedgerRepository extends Repository<LedgerEntry> {
  constructor(private dataSource: DataSource) {
    super(LedgerEntry, dataSource.createEntityManager());
  }

  /**
   * إنشاء قيد دفتر
   */
  async createEntry(data: Partial<LedgerEntry>): Promise<LedgerEntry> {
    const entry = this.create(data);
    return this.save(entry);
  }

  /**
   * إنشاء قيدي دفتر مزدوجين (مدين + دائن)
   */
  async createDoubleEntry(
    transactionId: string,
    debitAccount: string,
    creditAccount: string,
    amount: number,
    currency: Currency,
    description?: string,
  ): Promise<[LedgerEntry, LedgerEntry]> {
    const debitEntry = this.create({
      transaction_id: transactionId,
      entry_type: LedgerEntryType.DEBIT,
      account: debitAccount,
      amount,
      currency,
      description: description ? `${description} (DEBIT)` : 'DEBIT',
    });

    const creditEntry = this.create({
      transaction_id: transactionId,
      entry_type: LedgerEntryType.CREDIT,
      account: creditAccount,
      amount,
      currency,
      description: description ? `${description} (CREDIT)` : 'CREDIT',
    });

    const saved = await this.save([debitEntry, creditEntry]);
    return [saved[0], saved[1]];
  }

  /**
   * إيجاد قيود لمعاملة
   */
  async findByTransactionId(transactionId: string): Promise<LedgerEntry[]> {
    return this.find({
      where: { transaction_id: transactionId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * إيجاد قيود لحساب معين
   */
  async findByAccount(account: string): Promise<LedgerEntry[]> {
    return this.find({
      where: { account },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * التسوية - التحقق من توازن المدين والدائن
   */
  async reconcile(): Promise<{
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
  }> {
    const result = await this.createQueryBuilder('le')
      .select('SUM(CASE WHEN le.entry_type = :debit THEN le.amount ELSE 0 END)', 'totalDebits')
      .addSelect('SUM(CASE WHEN le.entry_type = :credit THEN le.amount ELSE 0 END)', 'totalCredits')
      .setParameters({ debit: 'DEBIT', credit: 'CREDIT' })
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits ?? '0');
    const totalCredits = parseFloat(result?.totalCredits ?? '0');
    const difference = Math.abs(totalDebits - totalCredits);

    return {
      totalDebits,
      totalCredits,
      difference,
      isBalanced: difference < 0.0001, // السماح بفرق طفيف بسبب الفاصلة العائمة
    };
  }

  /**
   * الحصول على لقطة لحساب (مجموع المدين والدائن)
   */
  async getAccountSnapshot(account: string): Promise<{
    account: string;
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
  }> {
    const result = await this.createQueryBuilder('le')
      .select('le.account', 'account')
      .addSelect('SUM(CASE WHEN le.entry_type = :debit THEN le.amount ELSE 0 END)', 'totalDebits')
      .addSelect('SUM(CASE WHEN le.entry_type = :credit THEN le.amount ELSE 0 END)', 'totalCredits')
      .where('le.account = :account', { account })
      .setParameters({ debit: 'DEBIT', credit: 'CREDIT' })
      .groupBy('le.account')
      .getRawOne();

    const totalDebits = parseFloat(result?.totalDebits ?? '0');
    const totalCredits = parseFloat(result?.totalCredits ?? '0');

    return {
      account,
      totalDebits,
      totalCredits,
      netBalance: totalCredits - totalDebits,
    };
  }
}
