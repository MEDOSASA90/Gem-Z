/**
 * =============================================================================
 * MessageReaction Entity - كيان تفاعلات الرسائل
 * =============================================================================
 * يسجل تفاعلات المستخدمين على الرسائل (إيموجي reactions).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('message_reactions')
@Unique(['message_id', 'user_id'])
@Index(['message_id'])
@Index(['user_id'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الرسالة */
  @Column({ type: 'uuid' })
  message_id: string;

  /** معرف المستخدم المتفاعل */
  @Column({ type: 'uuid' })
  user_id: string;

  /** التفاعل (إيموجي) */
  @Column({ type: 'varchar', length: 50 })
  reaction: string;

  /** تاريخ التفاعل */
  @CreateDateColumn()
  created_at: Date;
}
