/**
 * =============================================================================
 * Profile DTOs - كائنات نقل البيانات لملف تعريف صانع المحتوى
 * =============================================================================
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  IsUUID,
  Length,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatorType, CreatorStatus, VerificationStatus, PayoutMethod } from './creator-profile.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Shared DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class SocialLinksDto {
  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  instagram?: string;

  @ApiPropertyOptional({ description: 'Twitter/X profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  twitter?: string;

  @ApiPropertyOptional({ description: 'YouTube channel URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  youtube?: string;

  @ApiPropertyOptional({ description: 'TikTok profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  tiktok?: string;

  @ApiPropertyOptional({ description: 'Facebook profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  facebook?: string;

  @ApiPropertyOptional({ description: 'Personal website URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  website?: string;
}

export class PayoutDetailsDto {
  @ApiPropertyOptional({ description: 'Bank account IBAN' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ description: 'SWIFT code' })
  @IsOptional()
  @IsString()
  swift_code?: string;

  @ApiPropertyOptional({ description: 'PayPal email' })
  @IsOptional()
  @IsString()
  paypal_email?: string;

  @ApiPropertyOptional({ description: 'Country of bank account' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  account_holder_name?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CreateCreatorProfileDto {
  @ApiProperty({ description: 'User ID to associate with this creator profile' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: CreatorType, description: 'Type of creator' })
  @IsEnum(CreatorType)
  creator_type: CreatorType;

  @ApiProperty({ description: 'Display name shown to public', maxLength: 255 })
  @IsString()
  @Length(2, 255)
  display_name: string;

  @ApiPropertyOptional({ description: 'Biography / About' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cover_image?: string;

  @ApiPropertyOptional({ description: 'List of specialties', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: 'List of certifications', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ description: 'Social media links', type: SocialLinksDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  social_links?: SocialLinksDto;

  @ApiPropertyOptional({ description: 'Payout method preference', enum: PayoutMethod })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payout_method?: PayoutMethod;

  @ApiPropertyOptional({ description: 'Payout details', type: PayoutDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PayoutDetailsDto)
  payout_details?: PayoutDetailsDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateCreatorProfileDto extends PartialType(CreateCreatorProfileDto) {}

// ─────────────────────────────────────────────────────────────────────────────
// Search / Query DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class SearchCreatorProfilesDto {
  @ApiPropertyOptional({ description: 'Search query for name/bio' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CreatorType, description: 'Filter by creator type' })
  @IsOptional()
  @IsEnum(CreatorType)
  creator_type?: CreatorType;

  @ApiPropertyOptional({ description: 'Filter by specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Minimum rating', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  min_rating?: number;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['follower_count', 'subscriber_count', 'rating', 'created_at'] })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateVerificationStatusDto {
  @ApiProperty({ enum: VerificationStatus, description: 'New verification status' })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiPropertyOptional({ description: 'Rejection reason if rejected' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow DTO
// ─────────────────────────────────────────────────────────────────────────────

export class FollowCreatorDto {
  @ApiProperty({ description: 'Creator profile ID to follow' })
  @IsUUID()
  creator_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTO (for serialization)
// ─────────────────────────────────────────────────────────────────────────────

export class CreatorProfileResponseDto {
  id: string;
  user_id: string;
  creator_type: CreatorType;
  display_name: string;
  bio: string | null;
  avatar: string | null;
  cover_image: string | null;
  specialties: string[];
  certifications: string[];
  social_links: Record<string, string> | null;
  follower_count: number;
  subscriber_count: number;
  total_revenue: number;
  rating: number;
  review_count: number;
  verification_status: VerificationStatus;
  stripe_connect_id: string | null;
  payout_method: PayoutMethod | null;
  status: CreatorStatus;
  created_at: Date;
  updated_at: Date;
}
