/**
 * =============================================================================
 * ApiResponseDto - DTO لاستجابة API الموحدة
 * =============================================================================
 */

import { IsBoolean, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'هل العملية ناجحة' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'البيانات المُعادة' })
  @IsOptional()
  data?: T;

  @ApiPropertyOptional({ description: 'معلومات إضافية' })
  @IsOptional()
  @IsObject()
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'رسالة الخطأ' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'كود الخطأ' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ description: 'كود حالة HTTP' })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  constructor(partial?: Partial<ApiResponseDto<T>>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /** إنشاء استجابة ناجحة */
  static success<T>(data: T, meta?: Record<string, unknown>): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    });
  }

  /** إنشاء استجابة خطأ */
  static error<T>(
    message: string,
    errorCode: string,
    statusCode: number,
    data?: T,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      success: false,
      message,
      errorCode,
      statusCode,
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  }
}
