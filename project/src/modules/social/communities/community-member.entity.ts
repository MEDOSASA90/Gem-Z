/**
 * =============================================================================
 * CommunityMember Entity - كيان أعضاء المجتمعات
 * =============================================================================
 * يربط المستخدمين بالمجتمعات مع أدوار (ADMIN, MODERATOR, MEMBER).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/** دور العضو */
export enum CommunityMemberRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

/** حالة العضوية */
export enum MembershipStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  BANNED = 'BANNED',
}

@Entity('community_members')
@Unique(['community_id', 'user_id'])
@Index(['community_id'])
@Index(['user_id'])
@Index(['role'])
export class CommunityMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المجتمع */
  @Column({ type: 'uuid' })
  community_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** دور العضو */
  @Column({
    type: 'enum',
    enum: CommunityMemberRole,
    default: CommunityMemberRole.MEMBER,
  })
  role: CommunityMemberRole;

  /** حالة العضوية */
  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.APPROVED,
  })
  membership_status: MembershipStatus;

  /** تاريخ الانضمام */
  @CreateDateColumn()
  joined_at: Date;
}
