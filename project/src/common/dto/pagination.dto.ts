/**
 * =============================================================================
 * PaginationDto - DTO للـ Pagination
 * =============================================================================
 */

import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'حقل الترتيب', default: 'created_at' })
  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @ApiPropertyOptional({ description: 'اتجاه الترتيب (ASC/DESC)', default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: string = 'DESC';

  /** حساب الـ offset */
  get offset(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }

  /** إنشاء meta للاستجابة */
  createMeta(total: number): { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } {
    const page = this.page || 1;
    const limit = this.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
