/**
 * =============================================================================
 * Creator Payout Entity - كيان طلب السحب
 * =============================================================================
 * يمثل طلب سحب لصانع محتوى من إيراداته
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
import { CreatorProfile } from '../profile/creator-profile.entity';

/** حالة طلب السحب */
export enum PayoutStatus {
  PENDING = 'PENDING',           // بانتظار المراجعة
  PROCESSING = 'PROCESSING',     // قيد المعالجة
  APPROVED = 'APPROVED',         // تمت الموافقة
  PAID = 'PAID',                 // تم الدفع
  FAILED = 'FAILED',             // فشل
  REVERSED = 'REVERSED',         // تم الإلغاء/الاسترداد
}

/** طريقة السحب */
export enum PayoutMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',   // تحويل بنكي
  PAYPAL = 'PAYPAL',                 // PayPal
  STRIPE_CONNECT = 'STRIPE_CONNECT', // Stripe Connect
}

@Entity('creator_payouts')
@Index(['creator_id'])
@Index(['status'])
@Index(['scheduled_at'])
@Index(['batch_id'])
export class CreatorPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** معرف دفعة المدفوعات (لتجميع عمليات السحب) */
  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  /** المبلغ الإجمالي */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  gross_amount: number;

  /** رسوم المنصة (20% افتراضياً) */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  platform_fee: number;

  /** رسوم بوابة الدفع */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  payment_gateway_fee: number;

  /** رسوم تحويل العملة */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  fx_fee: number;

  /** خصم الضريبة */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  tax_deduction: number;

  /** المبلغ الصافي */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  net_amount: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** الحالة */
  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  /** طريقة السحب */
  @Column({
    type: 'enum',
    enum: PayoutMethod,
  })
  payout_method: PayoutMethod;

  /** تفاصيل السحب - مخزنة كـ JSON */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  payout_details: Record<string, unknown> | null;

  /** تاريخ الجدولة (متى يتم الدفع) */
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  /** تاريخ المعالجة (الفعلي) */
  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  /** معرف المعاملة في نظام الدفع الخارجي */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transaction_id: string | null;

  /** ملاحظات من الإدارة */
  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  /** سبب الفشل إن وجد */
  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى */
  @ManyToOne(() => CreatorProfile, (creator) => creator.payouts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;
}
