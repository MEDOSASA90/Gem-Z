import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Currency } from '../../../common/enums';

/**
 * كيان سعر صرف العملات
 * FX Rate Entity - Foreign exchange rates between currencies
 * 
 * يخزن السعر الأساسي + السبريد = السعر الفعلي
 * Stores base rate + spread = effective rate
 */
@Entity('fx_rates')
@Index(['from_currency', 'to_currency'])
@Index(['expires_at'])
export class FXRate {
  /** معرف فريد UUID */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** العملة المصدر */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  from_currency!: Currency;

  /** العملة الوجهة */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  to_currency!: Currency;

  /** السعر الأساسي (من مزود السيولة) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(8) ?? '0.00000000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  rate!: number;

  /** السبريد (هامش الربح) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(8) ?? '0.00000000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  spread!: number;

  /** السعر الفعلي (rate + spread) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(8) ?? '0.00000000';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  effective_rate!: number;

  /** مصدر السعر (مثلاً 'mock', 'ecb', 'xignite') */
  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  /** تاريخ انتهاء الصلاحية */
  @Column()
  expires_at!: Date;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at!: Date;
}
