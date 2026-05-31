import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * كيان قاعدة الكاش باك
 * Cashback Rule Entity - Defines cashback calculation rules
 */
@Entity('cashback_rules')
export class CashbackRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** اسم القاعدة */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** الفئة (مثلاً: 'fitness', 'nutrition', 'marketplace') */
  @Column({ type: 'varchar', length: 100 })
  category!: string;

  /** النسبة المئوية (مثلاً: 0.05 = 5%) */
  @Column({
    type: 'decimal',
    precision: 5,
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
  percentage!: number;

  /** الحد الأدنى للمبلغ */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  min_amount!: number;

  /** الحد الأقصى للكاش باك */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  max_cashback!: number;

  /** هل القاعدة نشطة */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
