/**
 * =============================================================================
 * PostView Entity - كيان مشاهدات المنشورات
 * =============================================================================
 * يسجل كل مشاهدة لمنشور (من مستخدم مسجل أو زائر).
 * يُستخدم لحساب populariy وتحليلات الـ Feed.
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

@Entity('post_views')
@Index(['post_id'])
@Index(['user_id'])
@Index(['created_at'])
export class PostView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور */
  @Column({ type: 'uuid' })
  post_id: string;

  /** معرف المستخدم المشاهد (null للزوار) */
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  /** IP address للزائر */
  @Column({ type: 'varchar', length: 45, nullable: true })
  viewer_ip: string | null;

  /** تاريخ المشاهدة */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  /** المنشور المشاهد */
  @ManyToOne(() => Post, (post) => post.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
