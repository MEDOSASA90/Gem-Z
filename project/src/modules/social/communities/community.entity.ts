/**
 * =============================================================================
 * Community Entity - كيان المجتمعات
 * =============================================================================
 * يمثل مجتمع (عام، خاص، جيم، creator، تحدي) مع إعدادات وقواعد.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/** نوع المجتمع */
export enum CommunityType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  GYM = 'GYM',
  CREATOR = 'CREATOR',
  CHALLENGE = 'CHALLENGE',
}

/** حالة المجتمع */
export enum CommunityStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

@Entity('communities')
@Index(['slug'], { unique: true })
@Index(['type'])
@Index(['status'])
@Index(['member_count'])
@Index(['created_at'])
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** اسم المجتمع */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** slug فريد */
  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** نوع المجتمع */
  @Column({
    type: 'enum',
    enum: CommunityType,
    default: CommunityType.PUBLIC,
  })
  type: CommunityType;

  /** صورة الغلاف */
  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_image: string | null;

  /** عدد الأعضاء */
  @Column({ type: 'int', default: 0 })
  member_count: number;

  /** عدد المنشورات */
  @Column({ type: 'int', default: 0 })
  post_count: number;

  /** قواعد المجتمع */
  @Column({ type: 'jsonb', nullable: true })
  rules: Array<{ title: string; description: string }> | null;

  /** إعدادات المجتمع */
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown> | null;

  /** الحالة */
  @Column({
    type: 'enum',
    enum: CommunityStatus,
    default: CommunityStatus.ACTIVE,
  })
  status: CommunityStatus;

  /** معرف المنشئ */
  @Column({ type: 'uuid' })
  created_by: string;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** تاريخ التحديث */
  @UpdateDateColumn()
  updated_at: Date;

  /** تاريخ الحذف */
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
