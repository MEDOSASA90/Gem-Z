/**
 * =============================================================================
 * AuditLog Entity - كيان سجل التدقيق
 * =============================================================================
 * partitioned monthly في PostgreSQL
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['resource_type', 'resource_id'])
@Index(['actor_id', 'actor_type'])
@Index(['action'])
@Index(['created_at'])
@Index(['risk_score'])
export class AuditLog {
  /** معرف فريد */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** نوع الإجراء (CREATE, UPDATE, DELETE, LOGIN, etc.) */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /** معرف الفاعل (user id, system, api_key, etc.) */
  @Column({ type: 'varchar', length: 100 })
  actor_id: string;

  /** نوع الفاعل (USER, SYSTEM, SERVICE, API_KEY) */
  @Column({ type: 'varchar', length: 30 })
  actor_type: string;

  /** نوع المورد (User, Wallet, Booking, Order, etc.) */
  @Column({ type: 'varchar', length: 50 })
  resource_type: string;

  /** معرف المورد */
  @Column({ type: 'varchar', length: 100 })
  resource_id: string;

  /** التغييرات (JSONB) - before/after values */
  @Column({ type: 'jsonb', nullable: true })
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    diff?: Array<{ field: string; old: unknown; new: unknown }>;
  } | null;

  /** عنوان IP */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  /** User Agent */
  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  /** درجة الخطورة (0-100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  risk_score: number;

  /** Correlation ID لربط الطلبات */
  @Column({ type: 'varchar', length: 100, nullable: true })
  correlation_id: string | null;

  /** معلومات إضافية */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    endpoint?: string;
    method?: string;
    module?: string;
    description?: string;
    tags?: string[];
  } | null;

  /** تاريخ الإنشاء (partitioned by month) */
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
