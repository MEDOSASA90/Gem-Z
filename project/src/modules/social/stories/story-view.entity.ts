/**
 * =============================================================================
 * StoryView Entity - كيان مشاهدات الستوريز
 * =============================================================================
 * يسجل كل مشاهدة لستوري مع معرف المشاهد.
 * Index فريد على (story_id, viewer_id) يمنع تكرار المشاهدة من نفس المستخدم.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Story } from './story.entity';

@Entity('story_views')
@Unique(['story_id', 'viewer_id'])
@Index(['story_id'])
@Index(['viewer_id'])
export class StoryView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الستوري */
  @Column({ type: 'uuid' })
  story_id: string;

  /** معرف المشاهد */
  @Column({ type: 'uuid' })
  viewer_id: string;

  /** تاريخ المشاهدة */
  @CreateDateColumn()
  viewed_at: Date;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Story, (story) => story.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'story_id' })
  story: Story;
}
