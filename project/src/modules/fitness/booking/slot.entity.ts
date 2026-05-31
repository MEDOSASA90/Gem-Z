/**
 * كيان حصة التدريب (Class Slot Entity)
 * يمثل حصة أو كلاس رياضي يمكن حجزه
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from './booking.entity';
import { SlotStatus } from '../../../common/enums/gym.enum';

@Entity('class_slots')
export class ClassSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'gym_id' })
  gym_id: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branch_id: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'trainer_id' })
  trainer_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  /** السعة القصوى */
  @Column({ type: 'int', nullable: false, default: 20, name: 'max_capacity' })
  max_capacity: number;

  /** عدد الحجوزات الحالية */
  @Column({ type: 'int', nullable: false, default: 0, name: 'booked_count' })
  booked_count: number;

  /** عدد قائمة الانتظار */
  @Column({ type: 'int', nullable: false, default: 0, name: 'waitlist_count' })
  waitlist_count: number;

  @Column({ type: 'timestamptz', nullable: false, name: 'start_time' })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: false, name: 'end_time' })
  end_time: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  room: string | null;

  /** المعدات المطلوبة */
  @Column({ type: 'text', array: true, default: [], name: 'equipment_needed' })
  equipment_needed: string[];

  @Column({
    type: 'enum',
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
  })
  status: SlotStatus;

  /** قاعدة التكرار (RRULE format) */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'recurrence_rule' })
  recurrence_rule: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
