/**
 * =============================================================================
 * Payout DTOs - كائنات نقل البيانات للمدفوعات
 * =============================================================================
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsObject,
  Length,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod, PayoutStatus } from './creator-payout.entity';
import { RevenueSourceType } from './revenue-split.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Request Payout DTO
// ─────────────────────────────────────────────────────────────────────────────

export class PayoutDetailsDto {
  @ApiPropertyOptional({ description: 'Bank account IBAN' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsOptional()
  @IsString()
  swift_code?: string;

  @ApiPropertyOptional({ description: 'PayPal email' })
  @IsOptional()
  @IsString()
  paypal_email?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  account_holder_name?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Bank account number (if no IBAN)' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiPropertyOptional({ description: 'Bank routing number' })
  @IsOptional()
  @IsString()
  routing_number?: string;
}

export class RequestPayoutDto {
  @ApiProperty({ description: 'Amount to withdraw', minimum: 10 })
  @IsNumber()
  @Min(10)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'USD';

  @ApiProperty({ enum: PayoutMethod, description: 'Payout method' })
  @IsEnum(PayoutMethod)
  payout_method: PayoutMethod;

  @ApiPropertyOptional({ description: 'Payout details', type: PayoutDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PayoutDetailsDto)
  payout_details?: PayoutDetailsDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Process Payout DTO (for admins)
// ─────────────────────────────────────────────────────────────────────────────

export class ProcessPayoutDto {
  @ApiPropertyOptional({ description: 'External transaction ID' })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue Calculation DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CalculateRevenueDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ enum: RevenueSourceType, description: 'Filter by source type' })
  @IsOptional()
  @IsEnum(RevenueSourceType)
  source_type?: RevenueSourceType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class GetPayoutHistoryDto {
  @ApiPropertyOptional({ enum: PayoutStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

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

export class CreatorPayoutResponseDto {
  id: string;
  creator_id: string;
  batch_id: string | null;
  gross_amount: number;
  platform_fee: number;
  payment_gateway_fee: number;
  fx_fee: number;
  tax_deduction: number;
  net_amount: number;
  currency: string;
  status: PayoutStatus;
  payout_method: PayoutMethod;
  scheduled_at: Date | null;
  processed_at: Date | null;
  transaction_id: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export class RevenueSplitResponseDto {
  id: string;
  creator_id: string;
  source_type: RevenueSourceType;
  source_id: string;
  gross_amount: number;
  platform_percentage: number;
  platform_amount: number;
  creator_amount: number;
  currency: string;
  is_paid_out: boolean;
  created_at: Date;
}

export class RevenueSummaryDto {
  total_gross: number;
  total_platform_fee: number;
  total_net: number;
  currency: string;
  by_source: Record<string, { gross: number; platform: number; net: number }>;
  period_start: Date;
  period_end: Date;
}
