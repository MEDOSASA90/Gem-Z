/**
 * =============================================================================
 * Reels DTOs - Data Transfer Objects للـ Reels Module
 * =============================================================================
 */

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReelStatus } from './reel.entity';
import { ReelEngagementType } from './reel-engagement.entity';

// ─── Upload Reel ───

export class UploadReelDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNotEmpty()
  @IsUrl()
  videoUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsString({ each: true })
  mentions?: string[];
}

// ─── Record View ───

export class RecordViewDto {
  @IsNotEmpty()
  @IsUUID()
  reelId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  watchDuration?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

// ─── Engagement ───

export class EngagementDto {
  @IsEnum(ReelEngagementType)
  type: ReelEngagementType;
}

// ─── Reel Query ───

export class ReelQueryDto {
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

// ─── Reel Response ───

export class ReelResponseDto {
  id: string;
  userId: string;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: ReelStatus;
  viewsCount: number;
  completionsCount: number;
  likesCount: number;
  commentsCount: number;
  shareCount: number;
  createdAt: Date;
}

// ─── Engagement Stats ───

export class EngagementStatsDto {
  reelId: string;
  views: number;
  completions: number;
  completionRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgWatchDuration: number;
  totalWatchDuration: number;
}
