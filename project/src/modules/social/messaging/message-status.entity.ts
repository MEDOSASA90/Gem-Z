/**
 * =============================================================================
 * MessageStatus Entity - كيان حالة الرسائل
 * =============================================================================
 * يتبع حالة كل رسالة لكل مشارك: SENT -> DELIVERED -> SEEN.
 * يتيح "تم الإرسال"، "تم التوصيل"، "تمت القراءة" مثل WhatsApp.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/** حالة الرسالة */
export enum MessageStatusEnum {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  SEEN = 'SEEN',
}

@Entity('message_status')
@Unique(['message_id', 'user_id'])
@Index(['message_id'])
@Index(['user_id'])
@Index(['status'])
export class MessageStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** معرف الرسالة */
  @Column({ type: 'uuid' })
  message_id: string;

  /** معرف المستخدم (المستلم) */
  @Column({ type: 'uuid' })
  user_id: string;

  /** الحالة الحالية */
  @Column({
    type: 'enum',
    enum: MessageStatusEnum,
    default: MessageStatusEnum.SENT,
  })
  status: MessageStatusEnum;

  /** تاريخ آخر تحديث */
  @UpdateDateColumn()
  updated_at: Date;
}
