/**
 * =============================================================================
 * Feed DTOs - Data Transfer Objects للـ Feed Module
 * =============================================================================
 * يحتوي على كل DTOs المستخدمة في إنشاء المنشورات والتعليقات والمشاركات
 * والبلاغات مع validation decorators.
 */

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsUrl,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PostType,
  PostVisibility,
} from './post.entity';
import { ReportReason } from './post-report.entity';
import { ShareType } from './post-share.entity';

// ─── Media DTO ───

export class CreatePostMediaDto {
  @IsEnum(['IMAGE', 'VIDEO'] as const)
  type: 'IMAGE' | 'VIDEO';

  @IsUrl()
  url: string;

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// ─── Create Post ───

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto[];

  @IsOptional()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[];
}

// ─── Create Comment ───

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

// ─── Share Post ───

export class SharePostDto {
  @IsEnum(ShareType)
  shareType: ShareType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;
}

// ─── Report Post ───

export class ReportPostDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

// ─── Feed Query ───

export class FeedQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @MaxLength(50)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  region?: string;
}

// ─── Toggle Like Response ───

export class LikeResponseDto {
  liked: boolean;
  likesCount: number;
}

// ─── Post Response ───

export class PostResponseDto {
  id: string;
  userId: string;
  content: string | null;
  type: PostType;
  visibility: PostVisibility;
  status: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  media: Array<{
    id: string;
    type: string;
    url: string;
    thumbnail: string | null;
    duration: number | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
