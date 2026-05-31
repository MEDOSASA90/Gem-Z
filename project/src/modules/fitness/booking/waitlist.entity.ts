/**
 * كيان قائمة الانتظار (Waitlist Entry Entity)
 * يمثل مستخدماً في قائمة انتظار حصة ممتلئة
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { WaitlistStatus } from '../../../common/enums/gym.enum';

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  @Column({ type: 'uuid', nullable: false, name: 'slot_id' })
  slot_id: string;

  /** موقع المستخدم في قائمة الانتظار */
  @Column({ type: 'int', nullable: false })
  position: number;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.WAITING,
  })
  status: WaitlistStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
