/**
 * =============================================================================
 * Conversation Entity - كيان المحادثات
 * =============================================================================
 * يمثل محادثة (فردية أو جماعية) بين مستخدمين أو أكثر.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity';

/** نوع المحادثة */
export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

@Entity('conversations')
@Index(['type'])
@Index(['last_message_at'])
@Index(['created_at'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** نوع المحادثة (فردية/جماعية) */
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  /** عنوان المحادثة (للمجموعات) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  /** صورة المحادثة (للمجموعات) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  /** معرف آخر رسالة */
  @Column({ type: 'uuid', nullable: true })
  last_message_id: string | null;

  /** تاريخ آخر رسالة */
  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  /** عدد المشاركين */
  @Column({ type: 'int', default: 0 })
  participants_count: number;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** تاريخ التحديث */
  @UpdateDateColumn()
  updated_at: Date;

  /** ─── العلاقات ─── */

  @OneToMany(() => ConversationParticipant, (participant) => participant.conversation, {
    cascade: true,
  })
  participants: ConversationParticipant[];
}
