/**
 * =============================================================================
 * Post Entity - كيان المنشورات في الـ Feed
 * =============================================================================
 * يمثل المنشور الرئيسي في النظام الاجتماعي، يدعم أنواع مختلفة من المحتوى
 * و-levels مختلفة من الرؤية (عام، للمتابعين، خاص)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PostMedia } from './post-media.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { PostShare } from './post-share.entity';
import { PostView } from './post-view.entity';
import { PostReport } from './post-report.entity';

/** أنواع المحتوى الممكن للمنشور */
export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LINK = 'LINK',
}

/** مستوى رؤية المنشور */
export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

/** حالة المنشور */
export enum PostStatus {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

@Entity('posts')
@Index(['user_id', 'created_at'])
@Index(['visibility', 'status'])
@Index(['created_at'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم صاحب المنشور */
  @Column({ type: 'uuid' })
  user_id: string;

  /** محتوى المنشور النصي */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** نوع المنشور (نص، صورة، فيديو، رابط) */
  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.TEXT,
  })
  type: PostType;

  /** مستوى الرؤية (عام، متابعين، خاص) */
  @Column({
    type: 'enum',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
  })
  visibility: PostVisibility;

  /** حالة المنشور */
  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.ACTIVE,
  })
  status: PostStatus;

  /** عدد الإعجابات */
  @Column({ type: 'int', default: 0 })
  likes_count: number;

  /** عدد التعليقات */
  @Column({ type: 'int', default: 0 })
  comments_count: number;

  /** عدد المشاركات */
  @Column({ type: 'int', default: 0 })
  shares_count: number;

  /** عدد المشاهدات */
  @Column({ type: 'int', default: 0 })
  views_count: number;

  /** بيانات إضافية (روابط، mentions، hashtags) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

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

  /** الميديا المرفقة بالمنشور */
  @OneToMany(() => PostMedia, (media) => media.post, { cascade: true })
  media: PostMedia[];

  /** الإعجابات على المنشور */
  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  /** التعليقات على المنشور */
  @OneToMany(() => PostComment, (comment) => comment.post)
  comments: PostComment[];

  /** المشاركات للمنشور */
  @OneToMany(() => PostShare, (share) => share.post)
  shares: PostShare[];

  /** المشاهدات للمنشور */
  @OneToMany(() => PostView, (view) => view.post)
  views: PostView[];

  /** البلاغات على المنشور */
  @OneToMany(() => PostReport, (report) => report.post)
  reports: PostReport[];
}
