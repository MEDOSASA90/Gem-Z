/**
 * =============================================================================
 * Creator Program Entity - كيان برنامج صانع المحتوى
 * =============================================================================
 * يمثل برنامج تدريبي أو غذائي أو تحويلي يقدمه صانع المحتوى
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CreatorProfile } from '../profile/creator-profile.entity';
import { ProgramEnrollment } from './program-enrollment.entity';

/** نوع البرنامج */
export enum ProgramType {
  WORKOUT = 'WORKOUT',           // برنامج تدريبي
  NUTRITION = 'NUTRITION',       // برنامج غذائي
  TRANSFORMATION = 'TRANSFORMATION', // برنامج تحويل
}

/** مستوى الصعوبة */
export enum ProgramDifficulty {
  BEGINNER = 'BEGINNER',         // مبتدئ
  INTERMEDIATE = 'INTERMEDIATE', // متوسط
  ADVANCED = 'ADVANCED',         // متقدم
}

/** بنية الدرس داخل البرنامج */
export interface ProgramLesson {
  id: string;                   // معرف فريد للدرس
  title: string;                // عنوان الدرس
  description?: string;          // وصف الدرس
  order: number;                // ترتيب الدرس
  duration_minutes: number;     // مدة الدرس بالدقائق
  video_url?: string;           // رابط فيديو الدرس
  thumbnail_url?: string;       // رابط صورة مصغرة
  resources?: {                 // الموارد المرفقة
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link';
  }[];
  is_free_preview?: boolean;    // هل متاح للمعاينة المجانية
}

@Entity('creator_programs')
@Index(['creator_id'])
@Index(['type'])
@Index(['is_published'])
@Index(['difficulty'])
@Index(['rating'])
export class CreatorProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف صانع المحتوى */
  @Column({ type: 'uuid' })
  creator_id: string;

  /** عنوان البرنامج */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** وصف البرنامج */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** نوع البرنامج */
  @Column({
    type: 'enum',
    enum: ProgramType,
    default: ProgramType.WORKOUT,
  })
  type: ProgramType;

  /** صورة الغلاف */
  @Column({ type: 'varchar', length: 512, nullable: true })
  cover_image: string | null;

  /** السعر */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** مدة البرنامج بالأسابيع */
  @Column({ type: 'int', default: 4 })
  duration_weeks: number;

  /** عدد الدروس */
  @Column({ type: 'int', default: 0 })
  lessons_count: number;

  /** الدروس - مخزنة كـ JSONB */
  @Column({ type: 'jsonb', default: [] })
  lessons: ProgramLesson[];

  /** مستوى الصعوبة */
  @Column({
    type: 'enum',
    enum: ProgramDifficulty,
    default: ProgramDifficulty.BEGINNER,
  })
  difficulty: ProgramDifficulty;

  /** المتطلبات المسبقة */
  @Column({ type: 'simple-array', default: '' })
  requirements: string[];

  /** النتائج المتوقعة */
  @Column({ type: 'simple-array', default: '' })
  outcomes: string[];

  /** هل البرنامج منشور ومتاح */
  @Column({ type: 'boolean', default: false })
  is_published: boolean;

  /** التقييم */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  /** عدد التقييمات */
  @Column({ type: 'int', default: 0 })
  rating_count: number;

  /** عدد المسجلين */
  @Column({ type: 'int', default: 0 })
  enrollment_count: number;

  /** عدد المكملين */
  @Column({ type: 'int', default: 0 })
  completion_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  // ── العلاقات ────────────────────────────────────────────────

  /** صانع المحتوى صاحب البرنامج */
  @ManyToOne(() => CreatorProfile, (creator) => creator.programs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorProfile;

  /** التسجيلات في البرنامج */
  @OneToMany(() => ProgramEnrollment, (enrollment) => enrollment.program)
  enrollments: ProgramEnrollment[];
}
