/**
 * DTOs للحجوزات والـ Slots وقائمة الانتظار
 */
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  IsDate,
  IsDecimal,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotStatus, BookingStatus, CheckInMethod, WaitlistStatus } from '../../../common/enums/gym.enum';

// ─── Slot DTOs ────────────────────────────────────────────────────

export class CreateSlotDto {
  @ApiProperty({ description: 'معرف الجيم' })
  @IsUUID()
  gym_id: string;

  @ApiPropertyOptional({ description: 'معرف الفرع' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'معرف المدرب' })
  @IsOptional()
  @IsUUID()
  trainer_id?: string;

  @ApiProperty({ description: 'اسم الحصة' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'الوصف' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'الفئة (YOGA, HIIT, etc.)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'السعة القصوى', minimum: 1 })
  @IsNumber()
  @Min(1)
  max_capacity: number;

  @ApiProperty({ description: 'وقت البدء' })
  @Type(() => Date)
  @IsDate()
  start_time: Date;

  @ApiProperty({ description: 'وقت الانتهاء' })
  @Type(() => Date)
  @IsDate()
  end_time: Date;

  @ApiPropertyOptional({ description: 'الغرفة' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'المعدات المطلوبة' })
  @IsOptional()
  @IsArray()
  equipment_needed?: string[];

  @ApiPropertyOptional({ description: 'قاعدة التكرار (RRULE)' })
  @IsOptional()
  @IsString()
  recurrence_rule?: string;
}

export class UpdateSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SlotStatus })
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_capacity?: number;
}

export class SlotFilterDto {
  @ApiProperty({ description: 'معرف الجيم' })
  @IsUUID()
  gym_id: string;

  @ApiPropertyOptional({ description: 'تاريخ الحصص' })
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ description: 'الفئة' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'معرف الفرع' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'الحد', default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

// ─── Booking DTOs ─────────────────────────────────────────────────

export class BookSlotDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'معرف الحصة' })
  @IsUUID()
  slot_id: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'سبب الإلغاء' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CheckInDto {
  @ApiProperty({ description: 'طريقة Check-in', enum: CheckInMethod })
  @IsEnum(CheckInMethod)
  method: CheckInMethod;
}

export class BookingFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

// ─── Waitlist DTOs ────────────────────────────────────────────────

export class JoinWaitlistDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'معرف الحصة' })
  @IsUUID()
  slot_id: string;
}
