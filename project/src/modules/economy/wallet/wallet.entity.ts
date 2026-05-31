import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  VersionColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Currency, WalletStatus, WalletType } from '../../../common/enums';

/**
 * كيان المحفظة - يمثل محفظة مالية لكل مستخدم ولكل عملة
 * Wallet Entity - Represents a user's financial wallet per currency
 * 
 * كل مستخدم يمكن أن يكون لديه محفظة واحدة لكل عملة مدعومة
 * Each user can have one wallet per supported currency
 */
@Entity('wallets')
@Index(['user_id'])
@Index(['currency'])
@Index(['status'])
export class Wallet {
  /** معرف فريد UUID */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المستخدم المالك */
  @Column('uuid')
  user_id!: string;

  /** عملة المحفظة */
  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.EGP,
  })
  currency!: Currency;

  /** الرصيد المتاح (المتوفر للاستخدام) - Decimal(18,4) لتجنب أخطاء الفاصلة العائمة */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(4) ?? '0.0000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  balance!: number;

  /** الرصيد المحجوز (ضمان أو مجمد) - لا يمكن استخدامه حتى يتم التحرير */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(4) ?? '0.0000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  held_balance!: number;

  /** حالة المحفظة */
  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status!: WalletStatus;

  /** نوع المحفظة */
  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.CONSUMER,
  })
  type!: WalletType;

  /** نسخة اللقطة - تزداد كل 50 حدث للحفاظ على الأداء */
  @VersionColumn({ default: 0 })
  snapshot_version!: number;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at!: Date;

  /** تاريخ آخر تحديث */
  @UpdateDateColumn()
  updated_at!: Date;

  /** المعاملات المرتبطة بالمحفظة */
  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions!: Transaction[];

  /**
   * الحصول على الرصيد الفعلي المتاح (الرصيد - المحجوز)
   */
  get availableBalance(): number {
    return this.balance - this.held_balance;
  }

  /**
   * التحقق من توفر رصيد كافٍ
   */
  hasSufficientBalance(amount: number): boolean {
    return this.availableBalance >= amount;
  }
}
