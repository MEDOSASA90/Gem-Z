/**
 * ============================================================================
 * GEM Z - Identity Module
 * User Entity - الكيان الأساسي للمستخدم
 * ============================================================================
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

/** حالات المستخدم الممكنة */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  BANNED = 'BANNED',
}

/** حالات KYC */
export enum KYCStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/** كيان المستخدم الرئيسي */
@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
@Index(['country'])
@Index(['kycStatus'])
@Index(['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: false })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 2, nullable: false })
  country: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'simple-enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ name: 'kyc_status', type: 'simple-enum', enum: KYCStatus, default: KYCStatus.PENDING })
  kycStatus: KYCStatus;

  @Column({ name: 'kyc_level', type: 'int', default: 0 })
  kycLevel: number;

  @Column({ name: 'fraud_score', type: 'int', default: 0 })
  fraudScore: number;

  @Column({ name: 'trusted_devices', type: 'simple-json', nullable: true })
  trustedDevices: Array<{
    fingerprint: string;
    name: string;
    trustedAt: string;
    lastUsed: string;
  }>;

  @Column({ type: 'simple-json', nullable: true })
  settings: Record<string, unknown>;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get isVerified(): boolean {
    return this.emailVerified && this.phoneVerified;
  }
}
