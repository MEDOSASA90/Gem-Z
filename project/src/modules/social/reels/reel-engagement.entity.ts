/**
 * =============================================================================
 * ReelEngagement Entity - كيان تفاعلات الريلز
 * =============================================================================
 * يسجل كل إعجاب وتعليق ومشاركة وحفظ على الريلز.
 * Index فريد على (reel_id, user_id, type) يمنع التفاعل المكرر من نفس المستخدم.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Reel } from './reel.entity';

/** أنواع التفاعل */
export enum ReelEngagementType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  SHARE = 'SHARE',
  SAVE = 'SAVE',
}

@Entity('reel_engagements')
@Unique(['reel_id', 'user_id', 'type'])
@Index(['reel_id', 'type'])
@Index(['user_id'])
export class ReelEngagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الريل */
  @Column({ type: 'uuid' })
  reel_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** نوع التفاعل */
  @Column({
    type: 'enum',
    enum: ReelEngagementType,
  })
  type: ReelEngagementType;

  /** تاريخ التفاعل */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Reel, (reel) => reel.engagements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;
}
