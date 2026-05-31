/**
 * DTOs للجيم والفروع والعضويات
 */
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsJSON,
  IsDecimal,
  IsDate,
  Min,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GymStatus, KYCStatus, BranchStatus, MembershipStatus } from '../../../common/enums/gym.enum';

// ─── Gym DTOs ─────────────────────────────────────────────────────

export class CreateGymDto {
  @ApiProperty({ description: 'معرف مالك الجيم' })
  @IsUUID()
  owner_id: string;

  @ApiProperty({ description: 'اسم الجيم', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'المعرف الفريد (slug)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({ description: 'وصف الجيم' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'رابط الشعار' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ description: 'إعدادات الجيم (JSON)' })
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateGymDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ enum: GymStatus })
  @IsOptional()
  @IsEnum(GymStatus)
  status?: GymStatus;

  @ApiPropertyOptional({ enum: KYCStatus })
  @IsOptional()
  @IsEnum(KYCStatus)
  kyc_status?: KYCStatus;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class GymFilterDto {
  @ApiPropertyOptional({ description: 'فلترة حسب المالك' })
  @IsOptional()
  @IsUUID()
  owner_id?: string;

  @ApiPropertyOptional({ enum: GymStatus })
  @IsOptional()
  @IsEnum(GymStatus)
  status?: GymStatus;

  @ApiPropertyOptional({ description: 'الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر بالصفحة', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

// ─── Branch DTOs ──────────────────────────────────────────────────

export class CreateBranchDto {
  @ApiProperty({ description: 'اسم الفرع' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'العنوان' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'المدينة' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'كود الدولة (ISO-2)' })
  @IsString()
  @Length(2)
  country: string;

  @ApiPropertyOptional({ description: 'الهاتف' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'خط العرض' })
  @IsOptional()
  @IsNumber()
  location_lat?: number;

  @ApiPropertyOptional({ description: 'خط الطول' })
  @IsOptional()
  @IsNumber()
  location_lon?: number;

  @ApiPropertyOptional({ description: 'المرافق', type: [String] })
  @IsOptional()
  @IsArray()
  facilities?: string[];

  @ApiPropertyOptional({ description: 'ساعات العمل' })
  @IsOptional()
  operating_hours?: Record<string, { open: string; close: string; isOpen: boolean }>;
}

export class UpdateBranchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  location_lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  location_lon?: number;

  @ApiPropertyOptional({ enum: BranchStatus })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;
}

// ─── Membership Plan DTOs ─────────────────────────────────────────

export class CreateMembershipPlanDto {
  @ApiProperty({ description: 'اسم الخطة' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'الوصف' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'المدة بالشهور' })
  @IsNumber()
  @Min(1)
  duration_months: number;

  @ApiProperty({ description: 'السعر' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'العملة (EGP, SAR, USD, EUR)' })
  @IsString()
  @Length(3)
  currency: string;

  @ApiPropertyOptional({ description: 'المميزات', type: [String] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ description: 'الحد الأقصى للأعضاء' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_members?: number;

  @ApiPropertyOptional({ description: 'معرفات الفروع المدعومة' })
  @IsOptional()
  @IsUUID(undefined, { each: true })
  branch_ids?: string[];
}

// ─── Membership Subscription DTOs ─────────────────────────────────

export class SubscribeDto {
  @ApiProperty({ description: 'معرف خطة العضوية' })
  @IsUUID()
  plan_id: string;

  @ApiPropertyOptional({ description: 'معرف الفرع المفضل' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'طريقة الدفع' })
  @IsOptional()
  @IsString()
  payment_method?: string;
}

export class RenewMembershipDto {
  @ApiProperty({ description: 'معرف العضوية' })
  @IsUUID()
  membership_id: string;
}
