import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('employee_wellness')
@Index(['corporate_client_id'])
@Index(['user_id'])
export class EmployeeWellness {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف عميل الشركات التابع له الموظف */
  @Column({ type: 'uuid', nullable: false })
  corporate_client_id: string;

  /** معرف المستخدم للموظف */
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  /** البيانات البيومترية الحيوية المجهرة (مثل متوسط الخطوات والنوم ومعدل ضربات القلب) */
  @Column({ type: 'jsonb', default: {} })
  biometric_data: Record<string, any>;

  /** نسبة المشاركة الفعالة للموظف في الأنشطة الرياضية (من 0 إلى 100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  participation_rate: number;

  /** نسبة إتمام التحديات الجماعية للموظف (من 0 إلى 100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  challenge_completion_ratio: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;
}
