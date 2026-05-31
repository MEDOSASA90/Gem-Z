/**
 * =============================================================================
 * PostComment Entity - كيان تعليقات المنشورات
 * =============================================================================
 * يمثل تعليق على منشور، يدعم التعليقات المتداخلة (replies) عبر parent_id.
 * Soft delete مدعوم للحفاظ على سياق المحادثة.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_comments')
@Index(['post_id'])
@Index(['user_id'])
@Index(['parent_id'])
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور */
  @Column({ type: 'uuid' })
  post_id: string;

  /** معرف المعلق */
  @Column({ type: 'uuid' })
  user_id: string;

  /** محتوى التعليق */
  @Column({ type: 'text' })
  content: string;

  /** معرف التعليق الأب (للردود) */
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  /** عدد الإعجابات على التعليق */
  @Column({ type: 'int', default: 0 })
  likes_count: number;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** تاريخ آخر تحديث */
  @UpdateDateColumn()
  updated_at: Date;

  /** تاريخ الحذف (soft delete) */
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  /** ─── العلاقات ─── */

  /** المنشور المعلق عليه */
  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
