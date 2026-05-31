/**
 * =============================================================================
 * Subscription Plan Entity - كيان خطة الاشتراك
 * =============================================================================
 * يمثل خطة اشتراك يقدمها صانع المحتوى للمشتركين
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CreatorProfile } from '../profile/creator-profile.entity';
import { CreatorSubscription } from './creator-subscription.entity';

/** فترة التجديد */
export enum SubscriptionInterval {
  MONTHLY = 'MONTHLY',   // شهري
  ANNUAL = 'ANNUAL',     // سنوي
  WEEKLY = 'WEEKLY',     // أسبوعي
}

@Entity('subscription_plans')
@Index(['creator_id'])
@Index(['is_active'])
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى صاحب الخطة */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** اسم الخطة */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** وصف الخطة */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** السعر */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** فترة التجديد */
  @Column({
    type: 'enum',
    enum: SubscriptionInterval,
    default: SubscriptionInterval.MONTHLY,
  })
  interval: SubscriptionInterval;

  /** المميزات المضمنة - مصفوفة نصوص */
  @Column({ type: 'simple-array', default: '' })
  features: string[];

  /** عدد أيام الفترة التجريبية المجانية */
  @Column({ type: 'int', default: 0 })
  trial_days: number;

  /** هل الخطة نشطة */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى صاحب الخطة */
  @ManyToOne(() => CreatorProfile, (creator) => creator.subscription_plans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;

  /** الاشتراكات على هذه الخطة */
  @OneToMany(() => CreatorSubscription, (sub) => sub.plan)
  subscriptions: CreatorSubscription[];
}
