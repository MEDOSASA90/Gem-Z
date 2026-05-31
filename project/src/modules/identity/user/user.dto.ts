/**
 * ============================================================================
 * GEM Z - Identity Module
 * User DTOs - كائنات نقل البيانات للمستخدم
 * ============================================================================
 */

import {
  IsEmail, IsString, IsOptional, IsEnum, IsObject, Length, Matches,
  IsNumber, Min, Max, IsPhoneNumber, IsISO31661Alpha2, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserStatus, KYCStatus } from './user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'البريد الإلكتروني', example: 'user@example.com' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف', example: '+966501234567' })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'رقم الهاتف غير صالح' })
  phone?: string;

  @ApiProperty({ description: 'كلمة المرور', example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @Length(8, 128, { message: 'كلمة المرور يجب ان تكون بين 8 و 128 حرفا' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'كلمة المرور يجب ان تحتوي على حرف كبير وصغير ورقم ورمز خاص',
  })
  password: string;

  @ApiProperty({ description: 'الاسم الاول', example: 'Ahmed' })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ description: 'الاسم الاخير', example: 'Mohammed' })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ description: 'رمز الدولة ISO', example: 'SA' })
  @IsISO31661Alpha2({ message: 'رمز الدولة غير صالح' })
  country: string;

  @ApiPropertyOptional({ description: 'المنطقة الزمنية', example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'اللغة المفضلة', example: 'ar' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'الحالة الجديدة', enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class UpdateUserSettingsDto {
  @ApiProperty({ description: 'الاعدادات', type: 'object' })
  @IsObject()
  settings: Record<string, unknown>;
}

export class UserResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() email: string;
  @Expose() @ApiPropertyOptional() phone?: string;
  @Expose() @ApiProperty() firstName: string;
  @Expose() @ApiProperty() lastName: string;
  @Expose() @ApiProperty() fullName: string;
  @Expose() @ApiPropertyOptional() avatarUrl?: string;
  @Expose() @ApiProperty() country: string;
  @Expose() @ApiProperty() timezone: string;
  @Expose() @ApiProperty() locale: string;
  @Expose() @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @Expose() @ApiProperty() emailVerified: boolean;
  @Expose() @ApiProperty() phoneVerified: boolean;
  @Expose() @ApiProperty({ enum: KYCStatus }) kycStatus: KYCStatus;
  @Expose() @ApiProperty() kycLevel: number;
  @Expose() @ApiPropertyOptional() lastLoginAt?: Date;
  @Expose() @ApiProperty() createdAt: Date;
  @Expose() @ApiProperty() updatedAt: Date;
}

export class UserProfileDto extends UserResponseDto {
  @Expose() @ApiProperty() settings: Record<string, unknown>;
}

export class UserSummaryDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() fullName: string;
  @Expose() @ApiProperty() email: string;
  @Expose() @ApiPropertyOptional() avatarUrl?: string;
  @Expose() @ApiProperty() status: UserStatus;
}

export class UserFilterDto {
  @ApiPropertyOptional({ description: 'البحث بالبريد او الاسم' })
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ description: 'تصفية بالحالة', enum: UserStatus })
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;

  @ApiPropertyOptional({ description: 'تصفية بالدولة' })
  @IsOptional() @IsISO31661Alpha2() country?: string;

  @ApiPropertyOptional({ description: 'تصفية بحالة KYC', enum: KYCStatus })
  @IsOptional() @IsEnum(KYCStatus) kycStatus?: KYCStatus;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional() @IsNumber() @Min(1) @Max(100) @Type(() => Number) limit?: number = 20;
}
