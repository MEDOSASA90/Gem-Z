/**
 * =============================================================================
 * PostShare Entity - كيان مشاركات المنشورات
 * =============================================================================
 * يمثل عملية مشاركة منشور (Repost أو Quote).
 * Repost: نشر المنشور كما هو، Quote: إضافة تعليق على المنشور الأصلي.
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
import { Post } from './post.entity';

/** نوع المشاركة */
export enum ShareType {
  REPOST = 'REPOST',
  QUOTE = 'QUOTE',
}

@Entity('post_shares')
@Unique(['post_id', 'user_id', 'share_type'])
@Index(['post_id'])
@Index(['user_id'])
export class PostShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور الأصلي */
  @Column({ type: 'uuid' })
  post_id: string;

  /** معرف المستخدم المشارك */
  @Column({ type: 'uuid' })
  user_id: string;

  /** نوع المشاركة */
  @Column({
    type: 'enum',
    enum: ShareType,
    default: ShareType.REPOST,
  })
  share_type: ShareType;

  /** المحتوى المضاف (للـ Quote فقط) */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** تاريخ المشاركة */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  /** المنشور الأصلي */
  @ManyToOne(() => Post, (post) => post.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
