import { IsUUID, IsNumber, IsEnum, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointsSource, PointsSpendPurpose, Currency } from '../../../common/enums';

// ============================================================================
// Points DTOs
// ============================================================================

/**
 * DTO لكسب نقاط
 */
export class EarnPointsDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ description: 'عدد النقاط', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PointsSource, description: 'مصدر النقاط' })
  @IsEnum(PointsSource)
  source!: PointsSource;

  @ApiProperty({ description: 'الوصف', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'معرف المرجع', required: false })
  @IsOptional()
  @IsUUID()
  reference_id?: string;
}

/**
 * DTO لإنفاق نقاط
 */
export class SpendPointsDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ description: 'عدد النقاط', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PointsSpendPurpose, description: 'الغرض' })
  @IsEnum(PointsSpendPurpose)
  purpose!: PointsSpendPurpose;

  @ApiProperty({ description: 'الوصف', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO لتحويل نقاط لمحفظة
 */
export class ConvertPointsDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ description: 'عدد النقاط للتحويل', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  points!: number;

  @ApiProperty({ enum: Currency, description: 'عملة المحفظة' })
  @IsEnum(Currency)
  currency!: Currency;
}

/**
 * DTO لرد رصيد النقاط
 */
export class PointsBalanceResponseDto {
  @ApiProperty()
  user_id!: string;

  @ApiProperty()
  balance!: number;

  @ApiProperty()
  lifetime_earned!: number;

  @ApiProperty()
  lifetime_spent!: number;
}

// ============================================================================
// Cashback DTOs
// ============================================================================

/**
 * DTO لحساب الكاش باك
 */
export class CalculateCashbackDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ description: 'المبلغ' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'الفئة' })
  @IsString()
  category!: string;
}

/**
 * DTO لإصدار كاش باك
 */
export class IssueCashbackDto {
  @ApiProperty({ description: 'معرف المحفظة' })
  @IsUUID()
  wallet_id!: string;

  @ApiProperty({ description: 'المبلغ' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'معرف الطلب/المعاملة', required: false })
  @IsOptional()
  @IsUUID()
  reference_id?: string;
}

/**
 * DTO لإنشاء قاعدة كاش باك
 */
export class CreateCashbackRuleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty({ description: 'النسبة (مثلاً 0.05 = 5%)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  percentage!: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_amount?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_cashback?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/**
 * DTO لرد حساب الكاش باك
 */
export class CashbackCalculationResponseDto {
  @ApiProperty()
  eligible_amount!: number;

  @ApiProperty()
  cashback_amount!: number;

  @ApiProperty()
  percentage!: number;

  @ApiProperty()
  rule_name!: string;

  @ApiProperty()
  rule_id!: string;
}
