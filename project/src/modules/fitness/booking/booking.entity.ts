/**
 * كيان الحجز (Booking Entity)
 * يمثل حجز مؤكد لمستخدم في حصة تدريبية
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus, CheckInMethod } from '../../../common/enums/gym.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  @Column({ type: 'uuid', nullable: false, name: 'slot_id' })
  slot_id: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'check_in_time' })
  check_in_time: Date | null;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
    nullable: true,
    name: 'check_in_method',
  })
  check_in_method: CheckInMethod | null;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellation_reason: string | null;

  /** غرامة الإلغاء المتأخر */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'penalty_amount' })
  penalty_amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' })
  correlation_id?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
