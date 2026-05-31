/**
 * =============================================================================
 * Stories DTOs - Data Transfer Objects للـ Stories Module
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
  Max,
} from 'class-validator';
import { StoryType, StoryStatus } from './story.entity';
import { StoryReactionType } from './story-reaction.entity';

// ─── Create Story ───

export class CreateStoryDto {
  @IsNotEmpty()
  @IsUrl()
  mediaUrl: string;

  @IsEnum(StoryType)
  type: StoryType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  duration?: number;
}

// ─── View Story ───

export class ViewStoryDto {
  @IsNotEmpty()
  @IsUUID()
  storyId: string;
}

// ─── Add Reaction ───

export class AddReactionDto {
  @IsEnum(StoryReactionType)
  reactionType: StoryReactionType;
}

// ─── Story Query ───

export class StoryQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}

// ─── Story Response ───

export class StoryResponseDto {
  id: string;
  userId: string;
  mediaUrl: string;
  type: StoryType;
  duration: number;
  status: StoryStatus;
  expiresAt: Date;
  viewCount: number;
  reactionCount: number;
  createdAt: Date;
  hasViewed?: boolean;
}
