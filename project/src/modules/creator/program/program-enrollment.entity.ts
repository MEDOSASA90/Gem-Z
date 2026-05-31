/**
 * =============================================================================
 * Program Enrollment Entity - كيان تسجيل في برنامج
 * =============================================================================
 * يمثل تسجيل مستخدم في برنامج تدريبي أو غذائي
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
import { CreatorProgram } from './creator-program.entity';

/** حالة التسجيل */
export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',         // مسجل (تم الدفع لكن لم يبدأ)
  IN_PROGRESS = 'IN_PROGRESS',   // قيد التقدم
  COMPLETED = 'COMPLETED',       // مكتمل
  DROPPED = 'DROPPED',           // منسحب
}

@Entity('program_enrollments')
@Index(['program_id'])
@Index(['user_id'])
@Index(['status'])
export class ProgramEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف البرنامج */
  @Column({ type: 'uuid' })
  program_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** حالة التسجيل */
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
  })
  status: EnrollmentStatus;

  /** نسبة الإنجاز (0-100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  /** معرف الدرس الحالي */
  @Column({ type: 'uuid', nullable: true })
  current_lesson_id: string | null;

  /** قائمة الدروس المكتملة - مصفوفة معرفات */
  @Column({ type: 'simple-array', default: '' })
  completed_lessons: string[];

  /** تاريخ بدء البرنامج */
  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  /** تاريخ إكمال البرنامج */
  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  /** سعر الشراء الفعلي */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  purchase_price: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** معرف معاملة الدفع */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_transaction_id: string | null;

  /** هل تم استرداد المبلغ */
  @Column({ type: 'boolean', default: false })
  is_refunded: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // ── العلاقات ────────────────────────────────────────────────

  /** البرنامج المسجل فيه */
  @ManyToOne(() => CreatorProgram, (program) => program.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'program_id' })
  program: CreatorProgram;
}
