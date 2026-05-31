/**
 * =============================================================================
 * Session Replay Entity - كيان إعادة الجلسة
 * =============================================================================
 * يمثل تسجيل إعادة لجلسة مباشرة منتهية
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LiveSession } from './live-session.entity';

@Entity('session_replays')
@Index(['session_id'])
@Index(['is_public'])
@Index(['available_until'])
export class SessionReplay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الجلسة الأصلية */
  @Column({ type: 'uuid' })
  session_id: string;

  /** رابط ملف الإعادة */
  @Column({ type: 'varchar', length: 512 })
  replay_url: string;

  /** رابط الصورة المصغرة */
  @Column({ type: 'varchar', length: 512, nullable: true })
  thumbnail_url: string | null;

  /** مدة الإعادة بالدقائق */
  @Column({ type: 'int' })
  duration_minutes: number;

  /** حجم الملف بالميجابايت */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  file_size_mb: number | null;

  /** عدد المشاهدات */
  @Column({ type: 'int', default: 0 })
  views_count: number;

  /** تاريخ انتهاء توفر الإعادة */
  @Column({ type: 'timestamptz' })
  available_until: Date;

  /** هل الإعادة متاحة للجميع أم للمشتركين فقط */
  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  /** معرف ملف في خدمة التخزين (S3, etc.) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  storage_key: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** الجلسة الأصلية */
  @ManyToOne(() => LiveSession, (session) => session.replays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: LiveSession;
}
