/**
 * كيان الموظف (Employee Entity)
 * يربط بين المستخدم والقسم والدور الوظيفي
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeStatus } from '../../../common/enums/gym.enum';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  /** كود الموظف الفريد */
  @Column({ type: 'varchar', length: 50, unique: true, nullable: false, name: 'employee_code' })
  employee_code: string;

  @Column({ type: 'uuid', nullable: true, name: 'department_id' })
  department_id: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'role_id' })
  role_id: string | null;

  /** نطاقات الصلاحيات (مثال: ["kyc:review", "gym:approve"]) */
  @Column({ type: 'text', array: true, default: [], name: 'permission_scopes' })
  permission_scopes: string[];

  /** نطاقات المناطق الجغرافية (مثال: ["EG", "SA"]) */
  @Column({ type: 'text', array: true, default: [], name: 'region_scopes' })
  region_scopes: string[];

  /** هل يتطلب MFA */
  @Column({ type: 'boolean', default: true, name: 'mfa_required' })
  mfa_required: boolean;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus;

  @Column({ type: 'date', nullable: false, name: 'hired_at' })
  hired_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
