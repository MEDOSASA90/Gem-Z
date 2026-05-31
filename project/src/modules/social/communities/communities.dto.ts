/**
 * =============================================================================
 * Communities DTOs - Data Transfer Objects للـ Communities Module
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
import { CommunityType, CommunityStatus } from './community.entity';
import { CommunityMemberRole, MembershipStatus } from './community-member.entity';

// ─── Create Community ───

export class CreateCommunityDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsEnum(CommunityType)
  type: CommunityType;

  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  rules?: Array<{ title: string; description: string }>;

  @IsOptional()
  settings?: Record<string, unknown>;
}

// ─── Update Community ───

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  rules?: Array<{ title: string; description: string }>;

  @IsOptional()
  settings?: Record<string, unknown>;
}

// ─── Member Filters ───

export class MemberFiltersDto {
  @IsOptional()
  @IsEnum(CommunityMemberRole)
  role?: CommunityMemberRole;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

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

// ─── Join Request ───

export class JoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

// ─── Update Member Role ───

export class UpdateMemberRoleDto {
  @IsEnum(CommunityMemberRole)
  role: CommunityMemberRole;
}

// ─── Pin Post ───

export class PinPostDto {
  @IsBoolean()
  pinned: boolean;
}

// ─── Feature Post ───

export class FeaturePostDto {
  @IsBoolean()
  featured: boolean;
}

// ─── Community Query ───

export class CommunityQueryDto {
  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;

  @IsOptional()
  @IsString()
  search?: string;

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

// ─── Response DTOs ───

export class CommunityResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: CommunityType;
  coverImage: string | null;
  memberCount: number;
  postCount: number;
  rules: Array<{ title: string; description: string }> | null;
  status: CommunityStatus;
  createdBy: string;
  createdAt: Date;
  isMember?: boolean;
  userRole?: CommunityMemberRole;
}

export class CommunityMemberResponseDto {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityMemberRole;
  membershipStatus: MembershipStatus;
  joinedAt: Date;
}
