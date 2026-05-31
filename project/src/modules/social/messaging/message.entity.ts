/**
 * =============================================================================
 * Message Entity - كيان الرسائل
 * =============================================================================
 * يمثل رسالة في محادثة، تدعم أنواعاً متعددة (نص، صورة، فيديو، صوت، ملف، موقع).
 * تدعم الرد على رسائل سابقة.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/** نوع الرسالة */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  VOICE = 'VOICE',
  FILE = 'FILE',
  LOCATION = 'LOCATION',
}

@Entity('messages')
@Index(['conversation_id', 'created_at'])
@Index(['sender_id'])
@Index(['reply_to_id'])
@Index(['created_at'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف المحادثة */
  @Column({ type: 'uuid' })
  conversation_id: string;

  /** معرف المرسل */
  @Column({ type: 'uuid' })
  sender_id: string;

  /** نوع الرسالة */
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  /** محتوى الرسالة (للنص) */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** رابط الميديا (للصور/الفيديو/الصوت/الملفات) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  media_url: string | null;

  /** بيانات إضافية (معلومات الملف، إحداثيات الموقع، إلخ) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** معرف الرسالة المردود عليها */
  @Column({ type: 'uuid', nullable: true })
  reply_to_id: string | null;

  /** تاريخ التعديل */
  @Column({ type: 'timestamptz', nullable: true })
  edited_at: Date | null;

  /** تاريخ الإنشاء */
  @CreateDateColumn()
  created_at: Date;

  /** تاريخ الحذف (soft delete) */
  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  /** ─── العلاقات ─── */

  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
