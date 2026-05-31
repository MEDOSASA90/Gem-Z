/**
 * ============================================================================
 * GEM Z - Identity Module
 * Permission Entity - كيان الصلاحية
 * ============================================================================
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** فئات الصلاحيات */
export enum PermissionCategory {
  FINANCE = 'FINANCE',
  KYC = 'KYC',
  OPERATIONS = 'OPERATIONS',
  SECURITY = 'SECURITY',
  CONTENT = 'CONTENT',
  SYSTEM = 'SYSTEM',
}

@Entity('permissions')
@Index(['scope'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** نطاق الصلاحية (مثال: wallet:read) */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  scope: string;

  /** الاجراء (read, write, delete, approve) */
  @Column({ type: 'varchar', length: 50, nullable: false })
  action: string;

  /** المورد (wallet, gym, user) */
  @Column({ type: 'varchar', length: 50, nullable: false })
  resource: string;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** الفئة */
  @Column({
    type: 'enum',
    enum: PermissionCategory,
    default: PermissionCategory.SYSTEM,
  })
  category: PermissionCategory;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
