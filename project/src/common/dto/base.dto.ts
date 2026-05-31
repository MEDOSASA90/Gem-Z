/**
 * =============================================================================
 * BaseDto - Base DTO مع Timestamps
 * =============================================================================
 */

import { IsUUID, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BaseDto {
  @ApiProperty({ description: 'المعرف الفريد' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({ description: 'تاريخ آخر تحديث' })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiProperty({ description: 'تاريخ الحذف (soft delete)', nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deleted_at?: Date | null;
}
