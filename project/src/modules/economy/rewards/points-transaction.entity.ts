import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PointsTransactionType, PointsSource } from '../../../common/enums';

/**
 * كيان معاملة النقاط
 * Points Transaction Entity - Records every points earn/spend
 */
@Entity('points_transactions')
@Index(['user_id'])
@Index(['type'])
@Index(['source'])
@Index(['created_at'])
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المستخدم */
  @Column('uuid')
  user_id!: string;

  /** نوع المعاملة: كسب أو إنفاق */
  @Column({
    type: 'enum',
    enum: PointsTransactionType,
  })
  type!: PointsTransactionType;

  /** الكمية */
  @Column({ type: 'integer' })
  amount!: number;

  /** المصدر */
  @Column({
    type: 'enum',
    enum: PointsSource,
  })
  source!: PointsSource;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** معرف المرجع */
  @Column('uuid', { nullable: true })
  reference_id!: string | null;

  /** الرصيد بعد المعاملة */
  @Column({ type: 'integer' })
  balance_after!: number;

  @CreateDateColumn()
  created_at!: Date;
}
