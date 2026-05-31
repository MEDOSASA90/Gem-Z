import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { Currency, TransactionType, TransactionStatus } from '../../../common/enums';

/**
 * كيان المعاملة - يسجل كل عملية على المحفظة
 * Transaction Entity - Records every operation on a wallet
 * 
 * كل معاملة لها نوع (إيداع/سحب/تحويل/...) وحالة (معلقة/مكتملة/...)
 */
@Entity('transactions')
@Index(['wallet_id'])
@Index(['reference_id', 'reference_type'])
@Index(['status'])
@Index(['created_at'])
export class Transaction {
  /** معرف فريد UUID */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المحفظة */
  @Column('uuid')
  wallet_id!: string;

  /** نوع المعاملة */
  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  /** المبلغ - موجب دائماً، نوع العملية يحدد الإتجاه */
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

  /** عملة المعاملة */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency!: Currency;

  /** وصف المعاملة */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** معرف المرجع (مثلاً معرف الطلب) */
  @Column('uuid', { nullable: true })
  reference_id!: string | null;

  /** نوع المرجع (مثلاً 'order', 'escrow', 'transfer') */
  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type!: string | null;

  /** الرصيد بعد تنفيذ المعاملة */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number | string | null): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        return value.toFixed(4);
      },
      from: (value: string | null): number | null => value === null ? null : parseFloat(value),
    },
  })
  balance_after!: number | null;

  /** حالة المعاملة */
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  /** بيانات إضافية مرنة */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at!: Date;

  /** العلاقة مع المحفظة */
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  /** قيود الدفتر المرتبطة */
  @OneToMany(() => LedgerEntry, (entry) => entry.transaction)
  ledger_entries!: LedgerEntry[];
}
