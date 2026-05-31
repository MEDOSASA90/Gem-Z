/**
 * =============================================================================
 * Story Entity - كيان الستوريز
 * =============================================================================
 * يمثل قصة مؤقتة تنتهي صلاحيتها تلقائياً بعد 24 ساعة.
 * يدعم صور وفيديوهات مع reactions.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { StoryView } from './story-view.entity';
import { StoryReaction } from './story-reaction.entity';

/** نوع محتوى الستوري */
export enum StoryType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

/** حالة الستوري */
export enum StoryStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}

@Entity('stories')
@Index(['user_id', 'created_at'])
@Index(['status', 'expires_at'])
@Index(['expires_at'])
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم صاحب الستوري */
  @Column({ type: 'uuid' })
  user_id: string;

  /** رابط الميديا */
  @Column({ type: 'varchar', length: 500 })
  media_url: string;

  /** نوع المحتوى (صورة/فيديو) */
  @Column({
    name: 'media_type',
    type: 'enum',
    enum: StoryType,
  })
  type: StoryType;

  /** مدة العرض بالثواني */
  @Column({ type: 'int', default: 5 })
  duration: number;

  /** الحالة الحالية */
  @Column({
    type: 'enum',
    enum: StoryStatus,
    default: StoryStatus.ACTIVE,
  })
  status: StoryStatus;

  /** تاريخ انتهاء الصلاحية (24 ساعة من الإنشاء) */
  @Column({ type: 'timestamptz' })
  expires_at: Date;

  /** عدد المشاهدات */
  @Column({ name: 'views_count', type: 'int', default: 0 })
  view_count: number;

  /** عدد التفاعلات */
  @Column({ name: 'reactions_count', type: 'int', default: 0 })
  reaction_count: number;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  @OneToMany(() => StoryView, (view) => view.story, { cascade: true })
  views: StoryView[];

  @OneToMany(() => StoryReaction, (reaction) => reaction.story, { cascade: true })
  reactions: StoryReaction[];
}
