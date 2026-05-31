/**
 * =============================================================================
 * CommunityPost Entity - كيان منشورات المجتمعات
 * =============================================================================
 * يربط المنشورات بالمجتمعات مع دعم pinned و featured posts.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('community_posts')
@Unique(['community_id', 'post_id'])
@Index(['community_id'])
@Index(['post_id'])
@Index(['pinned'])
@Index(['featured'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المجتمع */
  @Column({ type: 'uuid' })
  community_id: string;

  /** معرف المنشور */
  @Column({ type: 'uuid' })
  post_id: string;

  /** هل المنشور مثبت */
  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  /** هل المنشور مميز */
  @Column({ type: 'boolean', default: false })
  featured: boolean;

  /** تاريخ الإضافة */
  @CreateDateColumn()
  created_at: Date;
}
