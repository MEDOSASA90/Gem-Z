/**
 * كيان سجل الحضور (Attendance Record Entity)
 * يسجل دخول وخروج المستخدمين من الجيم
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CheckInMethod } from '../../../common/enums/gym.enum';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  @Column({ type: 'uuid', nullable: false, name: 'gym_id' })
  gym_id: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branch_id: string | null;

  @Column({ type: 'timestamptz', nullable: false, name: 'entry_time' })
  entry_time: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'exit_time' })
  exit_time: Date | null;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
    nullable: false,
  })
  method: CheckInMethod;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'qr_code' })
  qr_code: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'verified_by' })
  verified_by: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
