/**
 * كيان فرع الجيم (Gym Branch Entity)
 * يمثل موقعاً فرعياً واحداً لنادي رياضي
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
import { BranchStatus } from '../../../common/enums/gym.enum';
import { OperatingHours, BranchSettings } from '../../../common/interfaces/gym.interface';

@Entity('gym_branches')
export class GymBranch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الجيم الأب */
  @Column({ type: 'uuid', nullable: false, name: 'gym_id' })
  gym_id: string;

  /** اسم الفرع */
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  /** العنوان الكامل */
  @Column({ type: 'text', nullable: false })
  address: string;

  /** المدينة */
  @Column({ type: 'varchar', length: 100, nullable: false })
  city: string;

  /** الدولة (كود ISO-2) */
  @Column({ type: 'varchar', length: 2, nullable: false })
  country: string;

  /** رقم الهاتف */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  /** البريد الإلكتروني */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  /** خط العرض */
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'location_lat' })
  location_lat: number | null;

  /** خط الطول */
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'location_lon' })
  location_lon: number | null;

  /** المرافق المتوفرة (مثال: ["pool", "sauna", "parking"]) */
  @Column({ type: 'text', array: true, default: [] })
  facilities: string[];

  /** ساعات العمل (JSONB) */
  @Column({ type: 'jsonb', default: {}, name: 'operating_hours' })
  operating_hours: OperatingHours;

  /** حالة الفرع */
  @Column({
    type: 'enum',
    enum: BranchStatus,
    default: BranchStatus.ACTIVE,
  })
  status: BranchStatus;

  /** إعدادات الفرع (JSONB) */
  @Column({ type: 'jsonb', default: {} })
  settings: BranchSettings;

  /** العلاقة مع الجيم الأب */
  @ManyToOne(() => Gym, (gym) => gym.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
