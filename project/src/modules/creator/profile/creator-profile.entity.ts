/**
 * =============================================================================
 * Creator Profile Entity - كيان ملف تعريف صانع المحتوى
 * =============================================================================
 * يمثل ملف تعريف صانع المحتوى في منصة GEM Z
 * كل مستخدم يمكن أن يكون صانع محتوى من نوع: مدرب، أخصائي تغذية، مؤثر، صانع محتوى رياضي
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SubscriptionPlan } from '../subscription/subscription-plan.entity';
import { CreatorProgram } from '../program/creator-program.entity';
import { LiveSession } from '../live/live-session.entity';
import { CreatorPayout } from '../payout/creator-payout.entity';
import { RevenueSplit } from '../payout/revenue-split.entity';
import { CreatorAnalytics } from '../dashboard/creator-analytics.entity';

/** نوع صانع المحتوى */
export enum CreatorType {
  TRAINER = 'TRAINER',               // مدرب رياضي
  NUTRITIONIST = 'NUTRITIONIST',     // أخصائي تغذية
  INFLUENCER = 'INFLUENCER',         // مؤثر رياضي
  FITNESS_CREATOR = 'FITNESS_CREATOR', // صانع محتوى رياضي
}

/** حالة التحقق من صانع المحتوى */
export enum VerificationStatus {
  PENDING = 'PENDING',       // بانتظار التحقق
  VERIFIED = 'VERIFIED',     // تم التحقق
  REJECTED = 'REJECTED',     // مرفوض
}

/** حالة ملف صانع المحتوى */
export enum CreatorStatus {
  ACTIVE = 'ACTIVE',         // نشط
  SUSPENDED = 'SUSPENDED',   // موقوف
  PENDING = 'PENDING',       // بانتظار الموافقة
}

/** طريقة السحب */
export enum PayoutMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',   // تحويل بنكي
  PAYPAL = 'PAYPAL',                 // PayPal
  STRIPE_CONNECT = 'STRIPE_CONNECT', // Stripe Connect
}

@Entity('creator_profiles')
@Index(['user_id'], { unique: true })
@Index(['creator_type'])
@Index(['status'])
@Index(['verification_status'])
@Index(['rating'])
export class CreatorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم المرتبط - كل صانع محتوى هو مستخدم أولاً */
  @Column({ type: 'uuid' })
  user_id: string;

  /** نوع صانع المحتوى */
  @Column({
    type: 'enum',
    enum: CreatorType,
    default: CreatorType.FITNESS_CREATOR,
  })
  creator_type: CreatorType;

  /** الاسم المعروض للجمهور */
  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  /** السيرة الذاتية */
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /** رابط الصورة الرمزية */
  @Column({ type: 'varchar', length: 512, nullable: true })
  avatar: string | null;

  /** رابط صورة الغلاف */
  @Column({ type: 'varchar', length: 512, nullable: true })
  cover_image: string | null;

  /** التخصصات - مصفوفة نصوص */
  @Column({ type: 'simple-array', default: '' })
  specialties: string[];

  /** الشهادات والاعتمادات - مصفوفة نصوص */
  @Column({ type: 'simple-array', default: '' })
  certifications: string[];

  /** روابط التواصل الاجتماعي - مخزنة كـ JSON */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  social_links: Record<string, string> | null;

  /** عدد المتابعين */
  @Column({ type: 'int', default: 0 })
  follower_count: number;

  /** عدد المشتركين */
  @Column({ type: 'int', default: 0 })
  subscriber_count: number;

  /** إجمالي الإيرادات */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  total_revenue: number;

  /** التقييم (1-5) */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  /** عدد المراجعات */
  @Column({ type: 'int', default: 0 })
  review_count: number;

  /** حالة التحقق */
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verification_status: VerificationStatus;

  /** معرف Stripe Connect Account - للمدفوعات */
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_connect_id: string | null;

  /** طريقة السحب المفضلة */
  @Column({
    type: 'enum',
    enum: PayoutMethod,
    nullable: true,
  })
  payout_method: PayoutMethod | null;

  /** تفاصيل طريقة السحب - مخزنة كـ JSON مشفرة */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  payout_details: Record<string, unknown> | null;

  /** حالة الملف */
  @Column({
    type: 'enum',
    enum: CreatorStatus,
    default: CreatorStatus.PENDING,
  })
  status: CreatorStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  // ── العلاقات ────────────────────────────────────────────────

  /** خطط الاشتراك التي يقدمها صانع المحتوى */
  @OneToMany(() => SubscriptionPlan, (plan) => plan.creator)
  subscription_plans: SubscriptionPlan[];

  /** البرامج التي يقدمها صانع المحتوى */
  @OneToMany(() => CreatorProgram, (program) => program.creator)
  programs: CreatorProgram[];

  /** الجلسات المباشرة التي يقدمها صانع المحتوى */
  @OneToMany(() => LiveSession, (session) => session.creator)
  live_sessions: LiveSession[];

  /** طلبات السحب */
  @OneToMany(() => CreatorPayout, (payout) => payout.creator)
  payouts: CreatorPayout[];

  /** تقاسم الإيرادات */
  @OneToMany(() => RevenueSplit, (split) => split.creator)
  revenue_splits: RevenueSplit[];

  /** التحليلات اليومية */
  @OneToMany(() => CreatorAnalytics, (analytics) => analytics.creator)
  analytics: CreatorAnalytics[];
}
