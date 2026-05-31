/**
 * كيان الجيم (Gym Entity)
 * يمثل نادي رياضي في النظام مع إمكانية إدارة متعددة (SaaS)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GymBranch } from './branch.entity';
import { MembershipPlan } from './membership-plan.entity';
import { GymStatus, KYCStatus } from '../../../common/enums/gym.enum';
import { GymSettings, GymAnalytics } from '../../../common/interfaces/gym.interface';

@Entity('gyms')
export class Gym {
  /** معرف فريد */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف مالك الجيم */
  @Column({ type: 'uuid', nullable: false })
  owner_id: string;

  /** اسم الجيم */
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  /** معرّف فريد URL-friendly */
  @Column({ type: 'varchar', length: 200, unique: true, nullable: false })
  slug: string;

  /** وصف الجيم */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** رابط شعار الجيم */
  @Column({ type: 'text', nullable: true, name: 'logo_url' })
  logo_url: string;

  /** حالة الجيم: PENDING | ACTIVE | SUSPENDED | CLOSED */
  @Column({
    type: 'enum',
    enum: GymStatus,
    default: GymStatus.PENDING,
  })
  status: GymStatus;

  /** حالة KYC */
  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
    name: 'kyc_status',
  })
  kyc_status: KYCStatus;

  /** إعدادات الجيم (JSONB مرن) */
  @Column({ type: 'jsonb', default: {} })
  settings: GymSettings;

  /** تحليلات الجيم (JSONB) */
  @Column({ type: 'jsonb', default: {} })
  analytics: GymAnalytics;

  /** الفروع التابعة */
  @OneToMany(() => GymBranch, (branch) => branch.gym, { cascade: true })
  branches: GymBranch[];

  /** خطط العضوية */
  @OneToMany(() => MembershipPlan, (plan) => plan.gym, { cascade: true })
  membership_plans: MembershipPlan[];

  /** تاريخ الإنشاء */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  /** تاريخ آخر تحديث */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  /** تاريخ الحذف الناعم (Soft Delete) */
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}
