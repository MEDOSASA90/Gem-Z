import { IsUUID, IsNumber, IsEnum, IsString, IsOptional, IsObject, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, EscrowStatus } from '../../../common/enums';
import { ReleaseCondition } from './escrow.entity';

/**
 * DTO لإنشاء ضمان
 */
export class CreateEscrowDto {
  @ApiProperty({ description: 'معرف المحفظة' })
  @IsUUID()
  wallet_id!: string;

  @ApiProperty({ description: 'المبلغ', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ description: 'معرف الطلب' })
  @IsUUID()
  order_id!: string;

  @ApiProperty({ description: 'معرف البائع' })
  @IsUUID()
  seller_id!: string;

  @ApiProperty({ description: 'سبب الحجز', required: false })
  @IsOptional()
  @IsString()
  hold_reason?: string;

  @ApiProperty({ description: 'شروط التحرير', required: false, type: 'array' })
  @IsOptional()
  @IsArray()
  release_conditions?: ReleaseCondition[];
}

/**
 * DTO لتحرير الضمان
 */
export class ReleaseEscrowDto {
  @ApiProperty({ description: 'سبب التحرير', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO لرد الضمان
 */
export class RefundEscrowDto {
  @ApiProperty({ description: 'سبب الاسترداد' })
  @IsString()
  reason!: string;
}

/**
 * DTO لتصفية الضمانات
 */
export class EscrowFiltersDto {
  @ApiProperty({ enum: EscrowStatus, required: false })
  @IsOptional()
  @IsEnum(EscrowStatus)
  status?: EscrowStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  seller_id?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO لرد الضمان
 */
export class EscrowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  wallet_id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: Currency;

  @ApiProperty()
  order_id!: string;

  @ApiProperty()
  seller_id!: string;

  @ApiProperty()
  status!: EscrowStatus;

  @ApiProperty()
  hold_reason!: string | null;

  @ApiProperty()
  release_conditions!: ReleaseCondition[];

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  expires_at!: Date;

  @ApiProperty({ required: false })
  released_at!: Date | null;
}
