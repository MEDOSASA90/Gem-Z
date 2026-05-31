/**
 * =============================================================================
 * ReelView Entity - كيان مشاهدات الريلز
 * =============================================================================
 * يسجل تفاصيل مشاهدة كل ريل بما في ذلك مدة المشاهدة وإذا اكتمل أم لا.
 * يُستخدم لحساب completion rate وتحسين الـ algorithm.
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
import { Reel } from './reel.entity';

@Entity('reel_views')
@Index(['reel_id'])
@Index(['user_id'])
@Index(['created_at'])
export class ReelView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الريل */
  @Column({ type: 'uuid' })
  reel_id: string;

  /** معرف المستخدم المشاهد */
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  /** مدة المشاهدة بالثواني */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  watch_duration: number;

  /** هل شاهد الريل كاملاً */
  @Column({ type: 'boolean', default: false })
  completed: boolean;

  /** تاريخ المشاهدة */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Reel, (reel) => reel.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;
}
