/**
 * =============================================================================
 * Creator Subscription Entity - كيان اشتراك صانع المحتوى
 * =============================================================================
 * يمثل اشتراك مستخدم في خطة صانع محتوى
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

/** حالة الاشتراك */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',           // نشط
  CANCELLED = 'CANCELLED',     // ملغى (لا يتجدد)
  EXPIRED = 'EXPIRED',         // منتهي
  TRIAL = 'TRIAL',             // فترة تجريبية
  PAST_DUE = 'PAST_DUE',       // متأخر عن الدفع
}

@Entity('creator_subscriptions')
@Index(['subscriber_id'])
@Index(['creator_id'])
@Index(['plan_id'])
@Index(['status'])
@Index(['end_date'])
export class CreatorSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المشترك (مستخدم) */
  @Column({ type: 'uuid' })
  subscriber_id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** معرف خطة الاشتراك */
  @Column({ type: 'uuid' })
  plan_id: string;

  /** حالة الاشتراك */
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  /** تاريخ بدء الاشتراك */
  @Column({ type: 'timestamptz' })
  start_date: Date;

  /** تاريخ انتهاء الاشتراك */
  @Column({ type: 'timestamptz' })
  end_date: Date;

  /** تاريخ انتهاء الفترة التجريبية */
  @Column({ type: 'timestamptz', nullable: true })
  trial_ends_at: Date | null;

  /** هل يتجدد تلقائياً */
  @Column({ type: 'boolean', default: true })
  auto_renew: boolean;

  /** تاريخ الإلغاء (إذا ألغى المستخدم) */
  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  /** سعر الاشتراك الفعلي (قد يختلف عن سعر الخطة بسبب العروض) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  subscribed_price: number | null;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** معرف المعاملة في بوابة الدفع */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_transaction_id: string | null;

  /** عدد عمليات التجديد */
  @Column({ type: 'int', default: 0 })
  renewal_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** خطة الاشتراك */
  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;
}
