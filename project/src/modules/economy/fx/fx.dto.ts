import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

/**
 * DTO لطلب سعر الصرف
 */
export class GetRateDto {
  @ApiProperty({ enum: Currency, description: 'العملة المصدر' })
  @IsEnum(Currency)
  from!: Currency;

  @ApiProperty({ enum: Currency, description: 'العملة الوجهة' })
  @IsEnum(Currency)
  to!: Currency;
}

/**
 * DTO لتحويل مبلغ
 */
export class ConvertAmountDto {
  @ApiProperty({ description: 'المبلغ' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  from!: Currency;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  to!: Currency;
}

/**
 * DTO لرد التحويل
 */
export class ConversionResultDto {
  @ApiProperty()
  original_amount!: number;

  @ApiProperty()
  converted_amount!: number;

  @ApiProperty()
  rate!: number;

  @ApiProperty()
  effective_rate!: number;

  @ApiProperty()
  fee!: number;

  @ApiProperty()
  total_deducted!: number;

  @ApiProperty({ enum: Currency })
  from_currency!: Currency;

  @ApiProperty({ enum: Currency })
  to_currency!: Currency;

  @ApiProperty()
  expires_at!: Date;
}

/**
 * DTO للرسوم
 */
export class FeeCalculationDto {
  @ApiProperty()
  amount!: number;

  @ApiProperty()
  fee!: number;

  @ApiProperty()
  fee_percentage!: number;

  @ApiProperty()
  net_amount!: number;
}

/**
 * DTO لتحديث الأسعار (mock)
 */
export class UpdateRatesDto {
  @ApiPropertyOptional({ description: 'مصدر الأسعار', default: 'mock' })
  @IsOptional()
  @IsOptional()
  source?: string;
}
