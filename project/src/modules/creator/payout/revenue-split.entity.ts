/**
 * =============================================================================
 * Revenue Split Entity - كيان تقسيم الإيرادات
 * =============================================================================
 * يسجل كل معاملة إيرادات مع كيفية تقسيمها بين صانع المحتوى والمنصة
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CreatorProfile } from '../profile/creator-profile.entity';

/** نوع مصدر الإيرادات */
export enum RevenueSourceType {
  SUBSCRIPTION = 'SUBSCRIPTION',   // اشتراك
  PROGRAM = 'PROGRAM',             // برنامج
  LIVE_TIP = 'LIVE_TIP',           // إكرامية جلسة مباشرة
  AFFILIATE = 'AFFILIATE',         // تسويق بالعمولة
  COACHING = 'COACHING',           // جلسة تدريب شخصية
  MERCH = 'MERCH',                 // منتجات
}

@Entity('creator_revenue_splits')
@Index(['creator_id'])
@Index(['source_type'])
@Index(['source_id'])
@Index(['created_at'])
export class RevenueSplit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** نوع مصدر الإيرادات */
  @Column({
    type: 'enum',
    enum: RevenueSourceType,
  })
  source_type: RevenueSourceType;

  /** معرف المصدر (معرف الاشتراك/البرنامج/التذكرة) */
  @Column({ type: 'uuid' })
  source_id: string;

  /** المبلغ الإجمالي */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  gross_amount: number;

  /** نسبة المنصة (20% افتراضياً) */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  platform_percentage: number;

  /** مبلغ المنصة */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  platform_amount: number;

  /** مبلغ صانع المحتوى */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  creator_amount: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** معرف معاملة الدفع */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_transaction_id: string | null;

  /** هل تم تضمينها في دفعة سابقة */
  @Column({ type: 'boolean', default: false })
  is_paid_out: boolean;

  /** معرف دفعة السحب (إذا تم تضمينها) */
  @Column({ type: 'uuid', nullable: true })
  payout_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى */
  @ManyToOne(() => CreatorProfile, (creator) => creator.revenue_splits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;
}
