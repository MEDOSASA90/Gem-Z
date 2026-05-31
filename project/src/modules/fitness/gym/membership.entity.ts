/**
 * كيان العضوية (Membership Entity)
 * يمثل اشتراك فعّال لمستخدم في جيم معين
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MembershipStatus } from '../../../common/enums/gym.enum';

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  @Column({ type: 'uuid', nullable: false, name: 'gym_id' })
  gym_id: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branch_id: string | null;

  @Column({ type: 'uuid', nullable: false, name: 'plan_id' })
  plan_id: string;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status: MembershipStatus;

  @Column({ type: 'date', nullable: false, name: 'start_date' })
  start_date: Date;

  @Column({ type: 'date', nullable: false, name: 'end_date' })
  end_date: Date;

  @Column({ type: 'boolean', default: true, name: 'auto_renew' })
  auto_renew: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  payment_method: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
