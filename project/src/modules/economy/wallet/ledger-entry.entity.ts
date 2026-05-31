import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Currency, LedgerEntryType } from '../../../common/enums';

/**
 * كيان قيد الدفتر - المحاسبة المزدوجة
 * Ledger Entry Entity - Double-entry bookkeeping
 * 
 * كل معاملة تنشئ قيدين: مدين واحد ودائن واحد
 * Each transaction creates exactly 2 entries: 1 DEBIT + 1 CREDIT
 * 
 * الطاولة مقسمة (partitioned) شهرياً حسب created_at للأداء
 * Table is partitioned monthly by created_at for performance
 */
@Entity('ledger_entries')
@Index(['transaction_id'])
@Index(['account'])
@Index(['created_at'])
export class LedgerEntry {
  /** معرف فريد UUID */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المعاملة المرتبطة */
  @Column('uuid')
  transaction_id!: string;

  /** نوع القيد: مدين أو دائن */
  @Column({
    type: 'enum',
    enum: LedgerEntryType,
  })
  entry_type!: LedgerEntryType;

  /** الحساب - يمكن أن يكون wallet:{id} أو escrow:{id} أو revenue:{type} */
  @Column({ type: 'varchar', length: 100 })
  account!: string;

  /** المبلغ - Decimal(18,4) لتجنب أخطاء الفاصلة العائمة */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(4) ?? '0.0000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  amount!: number;

  /** عملة القيد */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency!: Currency;

  /** وصف القيد */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at!: Date;

  /** العلاقة مع المعاملة */
  @ManyToOne(() => Transaction, (transaction) => transaction.ledger_entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;
}
