/**
 * ============================================================================
 * GEM Z - Identity Module
 * Role Entity - كيان الدور الوظيفي
 * ============================================================================
 */

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  DeleteDateColumn, ManyToMany, JoinTable, Index,
} from 'typeorm';
import { Permission } from './permission.entity';

@Entity('roles')
@Index(['slug'], { unique: true, where: 'deleted_at IS NULL' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** اسم الدور */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  /** المعرف الفريد (slug) */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  slug: string;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** مستوى الدور (1=اعلى) - للترتيب الهرمي */
  @Column({ type: 'int', default: 1 })
  level: number;

  /** هل هو دور نظامي (لا يمكن حذفه) */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  /** الصلاحيات المرتبطة */
  @ManyToMany(() => Permission, { cascade: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
