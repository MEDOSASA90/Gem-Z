/**
 * ============================================================================
 * GEM Z - Identity Module
 * UserRole Entity - ربط المستخدم بالدور
 * ============================================================================
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('user_roles')
@Index(['userId', 'roleId'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم */
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  /** معرف الدور */
  @Column({ name: 'role_id', type: 'uuid', nullable: false })
  roleId: string;

  /** من قام بتعيين الدور */
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  /** المناطق المسموح بها (للتحكم الاقليمي) */
  @Column({ name: 'scope_regions', type: 'simple-array', default: '' })
  scopeRegions: string[];

  /** تاريخ انتهاء الدور (اختياري) */
  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
