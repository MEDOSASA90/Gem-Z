import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Currency, EscrowStatus } from '../../../common/enums';

/**
 * شروط تحرير الضمان
 */
export interface ReleaseCondition {
  type: string;
  description: string;
  required: boolean;
  fulfilled: boolean;
  fulfilled_at?: string;
}

/**
 * كيان الضمان - يحجز الأموال حتى استيفاء الشروط
 * Escrow Entity - Holds funds until release conditions are met
 * 
 * الأموال مجمدة لمدة 14 يوم كحد أدنى
 * Funds are frozen for minimum 14 days
 */
@Entity('escrows')
@Index(['wallet_id'])
@Index(['order_id'])
@Index(['seller_id'])
@Index(['status'])
@Index(['expires_at'])
export class Escrow {
  /** معرف فريد UUID */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المحفظة المحجوزة فيها الأموال */
  @Column('uuid')
  wallet_id!: string;

  /** المبلغ المحجوز */
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

  /** عملة المبلغ */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency!: Currency;

  /** معرف الطلب المرتبط */
  @Column('uuid', { nullable: true })
  order_id!: string | null;

  /** معرف البائع */
  @Column('uuid')
  seller_id!: string;

  /** حالة الضمان */
  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.HELD,
  })
  status!: EscrowStatus;

  /** سبب الحجز */
  @Column({ type: 'text', nullable: true })
  hold_reason!: string | null;

  /** شروط التحرير (JSON) */
  @Column({ type: 'jsonb', default: [] })
  release_conditions!: ReleaseCondition[];

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at!: Date;

  /** تاريخ انتهاء الحجز (افتراضياً 14 يوم) */
  @Column('timestamptz')
  expires_at!: Date;

  /** تاريخ التحرير */
  @Column('timestamptz', { nullable: true })
  released_at!: Date | null;
}
