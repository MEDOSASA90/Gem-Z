/**
 * ============================================================================
 * GEM Z - Identity Module
 * Session DTOs - كائنات نقل البيانات للجلسات
 * ============================================================================
 */

import {
  IsString, IsOptional, IsUUID, IsBoolean, IsIP, IsDateString, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** DTO لانشاء جلسة جديدة */
export class CreateSessionDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsString() @Length(1, 255) deviceFingerprint: string;
  @ApiProperty() @IsIP() ipAddress: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userAgent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 2) geoCountry?: string;
  @ApiProperty() @IsString() tokenHash: string;
  @ApiProperty() @IsString() refreshTokenHash: string;
  @ApiProperty() @IsDateString() expiresAt: string;
}

/** DTO الاستجابة للجلسة */
export class SessionResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() userId: string;
  @Expose() @ApiProperty() deviceFingerprint: string;
  @Expose() @ApiProperty() ipAddress: string;
  @Expose() @ApiPropertyOptional() userAgent?: string;
  @Expose() @ApiPropertyOptional() geoCountry?: string;
  @Expose() @ApiProperty() expiresAt: Date;
  @Expose() @ApiProperty() lastActiveAt: Date;
  @Expose() @ApiProperty() isActive: boolean;
  @Expose() @ApiProperty() mfaVerified: boolean;
  @Expose() @ApiProperty() createdAt: Date;
}

/** DTO لسرد الجلسات النشطة */
export class ActiveSessionsDto {
  @Expose() @ApiProperty({ type: [SessionResponseDto] }) sessions: SessionResponseDto[];
  @Expose() @ApiProperty() total: number;
}

/** DTO لطلب إلغاء جلسة */
export class RevokeSessionDto {
  @ApiProperty() @IsUUID() sessionId: string;
}

/** DTO لمعلومات الجهاز من الطلب */
export class DeviceInfoDto {
  @ApiProperty({ description: 'بصمة الجهاز' }) @IsString() fingerprint: string;
  @ApiProperty({ description: 'وكيل المستخدم' }) @IsOptional() @IsString() userAgent?: string;
  @ApiProperty({ description: 'عنوان IP' }) @IsIP() ip: string;
  @ApiProperty({ description: 'الدولة' }) @IsOptional() @IsString() geoCountry?: string;
  @ApiProperty({ description: 'المدينة' }) @IsOptional() @IsString() geoCity?: string;
}

/** DTO للموقع الجغرافي */
export class GeoLocationDto {
  @ApiProperty() @IsString() @Length(2, 2) country: string;
  @ApiProperty() @IsOptional() @IsString() city?: string;
  @ApiProperty() @IsOptional() lat?: number;
  @ApiProperty() @IsOptional() lon?: number;
}
