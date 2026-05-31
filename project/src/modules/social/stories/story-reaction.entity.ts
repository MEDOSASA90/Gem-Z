/**
 * =============================================================================
 * StoryReaction Entity - كيان تفاعلات الستوريز
 * =============================================================================
 * يسجل تفاعلات المستخدمين على الستوريز (إعجاب، حب، ضحك، إلخ).
 * يدعم Facebook-style reactions.
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

/** أنواع التفاعل */
export enum StoryReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  LAUGH = 'LAUGH',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
}

@Entity('story_reactions')
@Unique(['story_id', 'user_id'])
@Index(['story_id'])
@Index(['user_id'])
export class StoryReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الستوري */
  @Column({ type: 'uuid' })
  story_id: string;

  /** معرف المستخدم المتفاعل */
  @Column({ type: 'uuid' })
  user_id: string;

  /** نوع التفاعل */
  @Column({
    type: 'enum',
    enum: StoryReactionType,
    default: StoryReactionType.LIKE,
  })
  reaction_type: StoryReactionType;

  /** تاريخ التفاعل */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Story, (story) => story.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'story_id' })
  story: Story;
}
