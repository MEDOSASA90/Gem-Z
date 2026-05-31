/**
 * =============================================================================
 * Live Session DTOs - كائنات نقل البيانات للجلسات المباشرة
 * =============================================================================
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsDateString,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LiveSessionStatus } from './live-session.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Session DTO
// ─────────────────────────────────────────────────────────────────────────────

export class ScheduleSessionDto {
  @ApiProperty({ description: 'Session title', maxLength: 255 })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cover_image?: string;

  @ApiProperty({ description: 'Scheduled date and time (ISO 8601)' })
  @IsDateString()
  scheduled_at: string;

  @ApiPropertyOptional({ description: 'Expected duration in minutes', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  duration_minutes?: number = 60;

  @ApiPropertyOptional({ description: 'Is this a paid session', default: false })
  @IsOptional()
  @IsBoolean()
  is_paid?: boolean = false;

  @ApiPropertyOptional({ description: 'Ticket price (if paid)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticket_price?: number = 0;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Maximum attendees', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  max_attendees?: number = 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Session DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateSessionDto extends PartialType(ScheduleSessionDto) {}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Ticket DTO
// ─────────────────────────────────────────────────────────────────────────────

export class PurchaseTicketDto {
  @ApiProperty({ description: 'User ID purchasing the ticket' })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({ description: 'Payment transaction ID' })
  @IsOptional()
  @IsString()
  payment_transaction_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Start/End Session DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class StartSessionDto {
  @ApiPropertyOptional({ description: 'Stream key for the live stream' })
  @IsOptional()
  @IsString()
  stream_key?: string;

  @ApiPropertyOptional({ description: 'Stream URL for viewers' })
  @IsOptional()
  @IsString()
  stream_url?: string;
}

export class EndSessionDto {
  @ApiPropertyOptional({ description: 'Replay URL (if auto-generated)' })
  @IsOptional()
  @IsString()
  replay_url?: string;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsNumber()
  actual_duration_minutes?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Replay DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CreateReplayDto {
  @ApiProperty({ description: 'Replay video URL' })
  @IsString()
  @Length(1, 512)
  replay_url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  @Min(1)
  duration_minutes: number;

  @ApiPropertyOptional({ description: 'File size in MB' })
  @IsOptional()
  @IsNumber()
  file_size_mb?: number;

  @ApiProperty({ description: 'Available until date (ISO 8601)' })
  @IsDateString()
  available_until: string;

  @ApiPropertyOptional({ description: 'Is replay public', default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean = false;

  @ApiPropertyOptional({ description: 'Storage key (S3, etc.)' })
  @IsOptional()
  @IsString()
  storage_key?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class GetUpcomingSessionsDto {
  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  @IsOptional()
  @IsUUID()
  creator_id?: string;

  @ApiPropertyOptional({ description: 'Include paid sessions only', default: false })
  @IsOptional()
  @IsBoolean()
  paid_only?: boolean = false;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class LiveSessionResponseDto {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  scheduled_at: Date;
  duration_minutes: number;
  status: LiveSessionStatus;
  is_paid: boolean;
  ticket_price: number;
  currency: string;
  max_attendees: number;
  attendee_count: number;
  tickets_sold: number;
  replay_url: string | null;
  stream_url: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  actual_duration_minutes: number | null;
  created_at: Date;
  updated_at: Date;
}

export class LiveTicketResponseDto {
  id: string;
  session_id: string;
  user_id: string;
  status: string;
  price: number;
  currency: string;
  purchased_at: Date;
  used_at: Date | null;
}

export class SessionReplayResponseDto {
  id: string;
  session_id: string;
  replay_url: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  views_count: number;
  available_until: Date;
  is_public: boolean;
  created_at: Date;
}
