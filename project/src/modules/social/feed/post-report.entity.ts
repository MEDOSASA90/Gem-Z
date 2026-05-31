/**
 * =============================================================================
 * PostReport Entity - كيان بلاغات المنشورات
 * =============================================================================
 * يسجل بلاغات المستخدمين على محتوى مخالف.
 * يدعم سير عمل المراجعة والحل.
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
import { Post } from './post.entity';

/** حالة البلاغ */
export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

/** أسباب البلاغ */
export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  MISINFORMATION = 'MISINFORMATION',
  VIOLENCE = 'VIOLENCE',
  SELF_HARM = 'SELF_HARM',
  COPYRIGHT = 'COPYRIGHT',
  PRIVACY = 'PRIVACY',
  OTHER = 'OTHER',
}

@Entity('post_reports')
@Index(['post_id'])
@Index(['reporter_id'])
@Index(['status'])
export class PostReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور المُبلغ عنه */
  @Column({ type: 'uuid' })
  post_id: string;

  /** معرف المُبلغ */
  @Column({ type: 'uuid' })
  reporter_id: string;

  /** سبب البلاغ */
  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  /** وصف إضافي للبلاغ */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** حالة البلاغ */
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  /** معرف من قام بحل البلاغ */
  @Column({ type: 'uuid', nullable: true })
  resolved_by: string | null;

  /** تاريخ إنشاء البلاغ */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  /** المنشور المُبلغ عنه */
  @ManyToOne(() => Post, (post) => post.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
