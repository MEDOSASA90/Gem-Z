/**
 * =============================================================================
 * Reel Entity - كيان الريلز (الفيديوهات القصيرة)
 * =============================================================================
 * يمثل فيديو قصير مثل TikTok/Reels مع بيانات التحليلات.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReelView } from './reel-view.entity';
import { ReelEngagement } from './reel-engagement.entity';

/** حالة الريل */
export enum ReelStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

@Entity('reels')
@Index(['user_id', 'created_at'])
@Index(['status'])
@Index(['created_at'])
export class Reel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** العنوان */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** رابط الفيديو */
  @Column({ type: 'varchar', length: 500 })
  video_url: string;

  /** رابط Thumbnail */
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string | null;

  /** مدة الفيديو بالثواني */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  duration: number | null;

  /** حجم الملف بالبايت */
  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  /** الحالة الحالية */
  @Column({
    type: 'enum',
    enum: ReelStatus,
    default: ReelStatus.PENDING,
  })
  status: ReelStatus;

  /** عدد المشاهدات */
  @Column({ type: 'int', default: 0 })
  views_count: number;

  /** عدد المشاهدات الكاملة */
  @Column({ type: 'int', default: 0 })
  completions_count: number;

  /** عدد الإعجابات */
  @Column({ type: 'int', default: 0 })
  likes_count: number;

  /** عدد التعليقات */
  @Column({ type: 'int', default: 0 })
  comments_count: number;

  /** عدد المشاركات */
  @Column({ type: 'int', default: 0 })
  share_count: number;

  /** بيانات إضافية (hashtags, mentions, transcoding info) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** تاريخ التحديث */
  @UpdateDateColumn()
  updated_at: Date;

  /** تاريخ الحذف */
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  /** ─── العلاقات ─── */

  @OneToMany(() => ReelView, (view) => view.reel, { cascade: true })
  views: ReelView[];

  @OneToMany(() => ReelEngagement, (engagement) => engagement.reel, { cascade: true })
  engagements: ReelEngagement[];
}
