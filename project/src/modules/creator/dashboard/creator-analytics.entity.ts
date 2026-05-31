/**
 * =============================================================================
 * Creator Analytics Entity - كيان تحليلات صانع المحتوى
 * =============================================================================
 * يسجل الإحصائيات اليومية لصانع المحتوى للتحليلات ولوحة التحكم
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

@Entity('creator_analytics')
@Index(['creator_id', 'date'], { unique: true })
@Index(['date'])
export class CreatorAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** التاريخ (يوم واحد) */
  @Column({ type: 'date' })
  date: string;

  // ── الإيرادات ─────────────────────────────────────────────────

  /** إيرادات الاشتراكات */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  revenue_subscriptions: number;

  /** إيرادات البرامج */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  revenue_programs: number;

  /** إيرادات الجلسات المباشرة */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  revenue_live: number;

  /** إجمالي الإيرادات */
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  revenue_total: number;

  // ── المشتركين ─────────────────────────────────────────────────

  /** مشتركين جدد */
  @Column({ type: 'int', default: 0 })
  new_subscribers: number;

  /** مشتركين مفقودين (إلغاء) */
  @Column({ type: 'int', default: 0 })
  lost_subscribers: number;

  /** إجمالي المشتركين في نهاية اليوم */
  @Column({ type: 'int', default: 0 })
  total_subscribers: number;

  // ── التفاعل ───────────────────────────────────────────────────

  /** معدل التفاعل (0-100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagement_rate: number;

  /** عدد المشاهدات */
  @Column({ type: 'int', default: 0 })
  views_count: number;

  /** زيارات الملف الشخصي */
  @Column({ type: 'int', default: 0 })
  profile_visits: number;

  /** تعليقات جديدة */
  @Column({ type: 'int', default: 0 })
  new_comments: number;

  /** إعجابات جديدة */
  @Column({ type: 'int', default: 0 })
  new_likes: number;

  // ── البرامج والجلسات ──────────────────────────────────────────

  /** تسجيلات جديدة في البرامج */
  @Column({ type: 'int', default: 0 })
  program_enrollments: number;

  /** إكمالات البرامج */
  @Column({ type: 'int', default: 0 })
  program_completions: number;

  /** تذاكر جلسات مباشرة مباعة */
  @Column({ type: 'int', default: 0 })
  live_tickets_sold: number;

  /** حاضرين جلسات مباشرة */
  @Column({ type: 'int', default: 0 })
  live_attendees: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى */
  @ManyToOne(() => CreatorProfile, (creator) => creator.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;
}
