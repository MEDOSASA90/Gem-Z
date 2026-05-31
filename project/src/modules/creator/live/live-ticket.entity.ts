/**
 * =============================================================================
 * Live Ticket Entity - كيان تذكرة الجلسة المباشرة
 * =============================================================================
 * يمثل تذكرة شراها مستخدم لحضور جلسة مباشرة مدفوعة
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LiveSession } from './live-session.entity';

/** حالة التذكرة */
export enum TicketStatus {
  PURCHASED = 'PURCHASED',   // تم الشراء
  USED = 'USED',             // تم استخدامها (حضور)
  REFUNDED = 'REFUNDED',     // تم استرداد المبلغ
  EXPIRED = 'EXPIRED',       // منتهية
}

@Entity('live_tickets')
@Index(['session_id'])
@Index(['user_id'])
@Index(['status'])
export class LiveTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الجلسة */
  @Column({ type: 'uuid' })
  session_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** حالة التذكرة */
  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PURCHASED,
  })
  status: TicketStatus;

  /** السعر المدفوع */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  /** العملة */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** تاريخ الشراء */
  @CreateDateColumn({ type: 'timestamptz' })
  purchased_at: Date;

  /** تاريخ الاستخدام */
  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  /** معرف معاملة الدفع */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_transaction_id: string | null;

  // ── العلاقات ────────────────────────────────────────────────

  /** الجلسة المرتبطة */
  @ManyToOne(() => LiveSession, (session) => session.tickets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: LiveSession;
}
