/**
 * =============================================================================
 * PostLike Entity - كيان إعجابات المنشورات
 * =============================================================================
 * يمثل إعجاب مستخدم على منشور معين.
 * Index فريد على (post_id, user_id) يمنع الإعجاب المكرر.
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
import { Post } from './post.entity';

@Entity('post_likes')
@Unique(['post_id', 'user_id'])
@Index(['post_id'])
@Index(['user_id'])
export class PostLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور */
  @Column({ type: 'uuid' })
  post_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** تاريخ الإعجاب */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  /** المنشور المعجب به */
  @ManyToOne(() => Post, (post) => post.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
