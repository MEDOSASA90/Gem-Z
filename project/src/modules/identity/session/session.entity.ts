/**
 * ============================================================================
 * GEM Z - Identity Module
 * Session Entity - كيان ادارة الجلسات
 * ============================================================================
 * يخزن معلومات جلسات تسجيل الدخول النشطة لكل مستخدم
 * ============================================================================
 */

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * كيان الجلسة - يمثل جلسة تسجيل دخول نشطة
 * كل جهاز يحصل على جلسة منفصلة
 */
@Entity('sessions')
@Index(['userId'], { where: 'is_active = true' })
@Index(['tokenHash'])
@Index(['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المستخدم صاحب الجلسة */
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  /** بصمة الجهاز (fingerprint) */
  @Column({ name: 'device_fingerprint', type: 'varchar', length: 255, nullable: false })
  deviceFingerprint: string;

  /** عنوان IP */
  @Column({ name: 'ip_address', type: 'inet', nullable: false })
  ipAddress: string;

  /** وكيل المستخدم (User-Agent) */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /** دولة الموقع الجغرافي */
  @Column({ name: 'geo_country', type: 'varchar', length: 2, nullable: true })
  geoCountry: string | null;

  /** Hash الـ access token (للتحقق السريع بدون فك تشفير JWT) */
  @Column({ name: 'token_hash', type: 'varchar', length: 255, nullable: false })
  tokenHash: string;

  /** Hash الـ refresh token */
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, nullable: false })
  refreshTokenHash: string;

  /** تاريخ انتهاء الجلسة */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt: Date;

  /** آخر نشاط */
  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt: Date;

  /** هل الجلسة نشطة؟ */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** هل تم التحقق من MFA؟ */
  @Column({ name: 'mfa_verified', type: 'boolean', default: false })
  mfaVerified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
