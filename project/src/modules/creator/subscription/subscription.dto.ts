/**
 * =============================================================================
 * Subscription DTOs - كائنات نقل البيانات للاشتراكات
 * =============================================================================
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsDecimal,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SubscriptionInterval } from './subscription-plan.entity';
import { SubscriptionStatus } from './creator-subscription.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Create Plan DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Plan price', example: 29.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'USD';

  @ApiProperty({ enum: SubscriptionInterval, description: 'Billing interval' })
  @IsEnum(SubscriptionInterval)
  interval: SubscriptionInterval;

  @ApiPropertyOptional({ description: 'List of features included', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Free trial days', default: 0, minimum: 0, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  trial_days?: number = 0;

  @ApiPropertyOptional({ description: 'Is plan active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Plan DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateSubscriptionPlanDto extends PartialType(CreateSubscriptionPlanDto) {}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribe DTO
// ─────────────────────────────────────────────────────────────────────────────

export class SubscribeDto {
  @ApiProperty({ description: 'Subscription plan ID to subscribe to' })
  @IsUUID()
  plan_id: string;

  @ApiPropertyOptional({ description: 'User ID (if not from auth token)' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Subscription DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Cancel immediately vs at period end', default: false })
  @IsOptional()
  @IsBoolean()
  cancel_immediately?: boolean = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query / Filter DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class GetCreatorSubscribersDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

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

  @ApiPropertyOptional({ description: 'Include expired subscriptions', default: false })
  @IsOptional()
  @IsBoolean()
  include_expired?: boolean = false;
}

export class GetActiveSubscriptionsDto {
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

export class SubscriptionPlanResponseDto {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: SubscriptionInterval;
  features: string[];
  trial_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CreatorSubscriptionResponseDto {
  id: string;
  subscriber_id: string;
  creator_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date;
  trial_ends_at: Date | null;
  auto_renew: boolean;
  cancelled_at: Date | null;
  subscribed_price: number | null;
  currency: string;
  renewal_count: number;
  created_at: Date;
  updated_at: Date;
}
