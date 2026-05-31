/**
 * =============================================================================
 * Live Session Entity - كيان الجلسة المباشرة
 * =============================================================================
 * يمثل جلسة مباشرة (بث مباشر) يقدمه صانع محتوى
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
import { LiveTicket } from './live-ticket.entity';
import { SessionReplay } from './session-replay.entity';

/** حالة الجلسة المباشرة */
export enum LiveSessionStatus {
  SCHEDULED = 'SCHEDULED',   // مجدولة
  LIVE = 'LIVE',             // مباشرة الآن
  ENDED = 'ENDED',           // منتهية
  CANCELLED = 'CANCELLED',   // ملغاة
}

@Entity('live_sessions')
@Index(['creator_id'])
@Index(['status'])
@Index(['scheduled_at'])
@Index(['is_paid'])
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** عنوان الجلسة */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** وصف الجلسة */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** صورة الغلاف */
  @Column({ type: 'varchar', length: 512, nullable: true })
  cover_image: string | null;

  /** تاريخ ووقت الجلسة المقرر */
  @Column({ type: 'timestamptz' })
  scheduled_at: Date;

  /** مدة الجلسة المتوقعة بالدقائق */
  @Column({ type: 'int', default: 60 })
  duration_minutes: number;

  /** الحالة الحالية */
  @Column({
    type: 'enum',
    enum: LiveSessionStatus,
    default: LiveSessionStatus.SCHEDULED,
  })
  status: LiveSessionStatus;

  /** هل الجلسة مدفوعة */
  @Column({ type: 'boolean', default: false })
  is_paid: boolean;

  /** سعر التذكرة (إذا كانت مدفوعة) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  ticket_price: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** الحد الأقصى للحضور */
  @Column({ type: 'int', default: 1000 })
  max_attendees: number;

  /** عدد الحاضرين حالياً */
  @Column({ type: 'int', default: 0 })
  attendee_count: number;

  /** عدد التذاكر المباعة */
  @Column({ type: 'int', default: 0 })
  tickets_sold: number;

  /** رابط الإعادة */
  @Column({ type: 'varchar', length: 512, nullable: true })
  replay_url: string | null;

  /** مفتاح البث (لتكامل مع خدمات البث) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  stream_key: string | null;

  /** رابط البث المباشر */
  @Column({ type: 'varchar', length: 512, nullable: true })
  stream_url: string | null;

  /** تاريخ بدء البث الفعلي */
  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  /** تاريخ انتهاء البث */
  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  /** المدة الفعلية بالدقائق */
  @Column({ type: 'int', nullable: true })
  actual_duration_minutes: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى صاحب الجلسة */
  @ManyToOne(() => CreatorProfile, (creator) => creator.live_sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;

  /** التذاكر المباعة */
  @OneToMany(() => LiveTicket, (ticket) => ticket.session)
  tickets: LiveTicket[];

  /** تسجيل الإعادة */
  @OneToMany(() => SessionReplay, (replay) => replay.session)
  replays: SessionReplay[];
}
