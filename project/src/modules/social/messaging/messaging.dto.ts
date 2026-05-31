/**
 * =============================================================================
 * Messaging DTOs - Data Transfer Objects للـ Messaging Module
 * =============================================================================
 */

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsUrl,
  IsInt,
  Min,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationType } from './conversation.entity';
import { ParticipantRole } from './conversation-participant.entity';
import { MessageType } from './message.entity';
import { MessageStatusEnum } from './message-status.entity';

// ─── Create Conversation ───

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  /** معرفات المشاركين (بدون المنشئ) */
  @IsArray()
  @IsUUID('all', { each: true })
  participantIds: string[];
}

// ─── Send Message ───

export class SendMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fileName?: string;

  @IsOptional()
  @IsInt()
  fileSize?: number;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  /** للموقع الجغرافي */
  @IsOptional()
  metadata?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    duration?: number; // for voice messages
  };
}

// ─── Update Status ───

export class UpdateStatusDto {
  @IsEnum(MessageStatusEnum)
  status: MessageStatusEnum;
}

// ─── Add Reaction ───

export class MessageReactionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  reaction: string;
}

// ─── Query DTOs ───

export class MessageQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

// ─── Participant DTO ───

export class AddParticipantDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;
}

// ─── Response DTOs ───

export class ConversationResponseDto {
  id: string;
  type: ConversationType;
  title: string | null;
  avatar: string | null;
  lastMessageId: string | null;
  lastMessageAt: Date | null;
  participantsCount: number;
  unreadCount: number;
  createdAt: Date;
}

export class MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  editedAt: Date | null;
  createdAt: Date;
  status: MessageStatusEnum;
}
