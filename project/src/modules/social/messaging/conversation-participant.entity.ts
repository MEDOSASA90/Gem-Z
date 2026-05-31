/**
 * =============================================================================
 * ConversationParticipant Entity - كيان مشاركي المحادثات
 * =============================================================================
 * يربط بين المستخدمين والمحادثات مع أدوار وصلاحيات.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/** دور المشارك */
export enum ParticipantRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Entity('conversation_participants')
@Unique(['conversation_id', 'user_id'])
@Index(['conversation_id'])
@Index(['user_id'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المحادثة */
  @Column({ type: 'uuid' })
  conversation_id: string;

  /** معرف المستخدم */
  @Column({ type: 'uuid' })
  user_id: string;

  /** دور المشارك */
  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  role: ParticipantRole;

  /** معرف آخر رسالة تم قراءتها */
  @Column({ type: 'uuid', nullable: true })
  last_read_message_id: string | null;

  /** هل المحادثة مكتومة */
  @Column({ type: 'boolean', default: false })
  is_muted: boolean;

  /** تاريخ الانضمام */
  @CreateDateColumn()
  joined_at: Date;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
