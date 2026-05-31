/**
 * =============================================================================
 * PostMedia Entity - كيان ميديا المنشورات
 * =============================================================================
 * يمثل الملفات المرفقة بالمنشور (صور، فيديوهات)
 * يدعم ترتيب الميديا وتخزين thumbnail للفيديوهات
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

/** أنواع الميديا المرفقة */
export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity('post_media')
@Index(['post_id'])
export class PostMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المنشور */
  @Column({ type: 'uuid' })
  post_id: string;

  /** نوع الميديا (صورة/فيديو) */
  @Column({
    type: 'enum',
    enum: PostMediaType,
  })
  type: PostMediaType;

  /** رابط الملف */
  @Column({ type: 'varchar', length: 500 })
  url: string;

  /** رابط Thumbnail (للفيديوهات) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string | null;

  /** مدة الفيديو بالثواني */
  @Column({ type: 'int', nullable: true })
  duration: number | null;

  /** حجم الملف بالبايت */
  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  /** ترتيب العرض */
  @Column({ type: 'int', default: 0 })
  order: number;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** ─── العلاقات ─── */

  /** المنشور المالك */
  @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
