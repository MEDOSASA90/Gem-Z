/**
 * ============================================================================
 * GEM Z - Identity Module
 * Auth DTOs - كائنات نقل البيانات للمصادقة
 * ============================================================================
 */

import {
  IsEmail, IsString, IsOptional, IsEnum, IsObject, Length, Matches,
  IsPhoneNumber, IsISO31661Alpha2, IsBoolean, IsUUID, IsIP, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

// ============================================================================
// Device / Geo DTOs
// ============================================================================

export class GeoLocationDto {
  @ApiProperty() @IsString() country: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() lat?: number;
  @ApiPropertyOptional() @IsOptional() lon?: number;
}

export class DeviceInfoDto {
  @ApiProperty({ description: 'بصمة الجهاز' }) @IsString() fingerprint: string;
  @ApiProperty({ description: 'وكيل المستخدم' }) @IsOptional() @IsString() userAgent?: string;
  @ApiProperty({ description: 'عنوان IP' }) @IsIP() ip: string;
  @ApiPropertyOptional({ description: 'الموقع الجغرافي' }) @IsOptional() @ValidateNested() @Type(() => GeoLocationDto) geo?: GeoLocationDto;
}

// ============================================================================
// Auth Request DTOs
// ============================================================================

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' }) @IsEmail() @Length(1, 255) email: string;
  @ApiPropertyOptional({ example: '+966501234567' }) @IsOptional() @IsPhoneNumber(undefined) phone?: string;
  @ApiProperty({ example: 'SecurePass123!' }) @IsString() @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Password must contain uppercase, lowercase, number and special char' })
  password: string;
  @ApiProperty({ example: 'Ahmed' }) @IsString() @Length(1, 100) firstName: string;
  @ApiProperty({ example: 'Mohammed' }) @IsString() @Length(1, 100) lastName: string;
  @ApiProperty({ example: 'SA' }) @IsISO31661Alpha2() country: string;
  @ApiPropertyOptional({ description: 'معلومات الجهاز' }) @IsOptional() @ValidateNested() @Type(() => DeviceInfoDto) deviceInfo?: DeviceInfoDto;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' }) @IsEmail() email: string;
  @ApiProperty({ example: 'SecurePass123!' }) @IsString() password: string;
  @ApiProperty({ description: 'معلومات الجهاز' }) @ValidateNested() @Type(() => DeviceInfoDto) deviceInfo: DeviceInfoDto;
}

export class MFAVerifyDto {
  @ApiProperty({ description: 'رمز MFA' }) @IsString() @Length(4, 8) code: string;
  @ApiProperty({ description: 'طريقة MFA', enum: ['sms', 'email', 'totp'] }) @IsEnum(['sms', 'email', 'totp'] as const) method: 'sms' | 'email' | 'totp';
}

export class MFASetupDto {
  @ApiProperty({ description: 'طريقة MFA', enum: ['sms', 'email', 'totp'] }) @IsEnum(['sms', 'email', 'totp'] as const) method: 'sms' | 'email' | 'totp';
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' }) @IsString() refreshToken: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'بصمة الجهاز' }) @IsOptional() @IsString() deviceFingerprint?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' }) @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Password must contain uppercase, lowercase, number and special char' })
  newPassword: string;
}

// ============================================================================
// Auth Response DTOs
// ============================================================================

export class TokenPairDto {
  @Expose() @ApiProperty() accessToken: string;
  @Expose() @ApiProperty() refreshToken: string;
  @Expose() @ApiProperty() accessTokenExpiresAt: Date;
  @Expose() @ApiProperty() refreshTokenExpiresAt: Date;
  @Expose() @ApiProperty() tokenType: string;
}

export class LoginResponseDto {
  @Expose() @ApiProperty() accessToken: string;
  @Expose() @ApiProperty() refreshToken: string;
  @Expose() @ApiProperty() tokenType: string;
  @Expose() @ApiProperty() expiresIn: number;
  @Expose() @ApiProperty() user: {
    id: string; email: string; firstName: string; lastName: string;
    fullName: string; avatarUrl?: string; kycStatus: string; kycLevel: number;
  };
  @Expose() @ApiProperty() mfaRequired: boolean;
  @Expose() @ApiPropertyOptional() mfaToken?: string;
}

export class MFASetupResponseDto {
  @Expose() @ApiProperty() secret: string;
  @Expose() @ApiProperty() qrCodeUri: string;
  @Expose() @ApiProperty() recoveryCodes: string[];
}

export class SessionListResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() deviceFingerprint: string;
  @Expose() @ApiPropertyOptional() userAgent?: string;
  @Expose() @ApiPropertyOptional() geoCountry?: string;
  @Expose() @ApiProperty() lastActiveAt: Date;
  @Expose() @ApiProperty() mfaVerified: boolean;
  @Expose() @ApiProperty() createdAt: Date;
}
