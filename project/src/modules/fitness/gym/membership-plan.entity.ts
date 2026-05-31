/**
 * كيان خطة العضوية (Membership Plan Entity)
 * يمثل باقة اشتراك يمكن للمستخدمين شراؤها
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Gym } from './gym.entity';

@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'gym_id' })
  gym_id: string;

  /** الفروع التي تدعم هذه الخطة (فارغ = الكل) */
  @Column({ type: 'uuid', array: true, default: [], name: 'branch_ids' })
  branch_ids: string[];

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** مدة الاشتراك بالشهور */
  @Column({ type: 'int', nullable: false, name: 'duration_months' })
  duration_months: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  /** العملة (EGP, SAR, USD, EUR) */
  @Column({ type: 'varchar', length: 3, nullable: false })
  currency: string;

  /** المميزات (مثال: ["unlimited_access", "pool", "sauna"]) */
  @Column({ type: 'text', array: true, default: [] })
  features: string[];

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  /** الحد الأقصى للأعضاء (null = غير محدود) */
  @Column({ type: 'int', nullable: true, name: 'max_members' })
  max_members: number | null;

  @ManyToOne(() => Gym, (gym) => gym.membership_plans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
