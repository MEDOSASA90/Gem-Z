/**
 * =============================================================================
 * Program DTOs - كائنات نقل البيانات للبرامج
 * =============================================================================
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsUUID,
  IsBoolean,
  Length,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProgramType, ProgramDifficulty, ProgramLesson } from './creator-program.entity';
import { EnrollmentStatus } from './program-enrollment.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Lesson DTO
// ─────────────────────────────────────────────────────────────────────────────

export class ProgramResourceDto {
  @ApiProperty({ description: 'Resource title' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ description: 'Resource URL' })
  @IsString()
  @Length(1, 512)
  url: string;

  @ApiProperty({ enum: ['pdf', 'video', 'link'], description: 'Resource type' })
  @IsEnum(['pdf', 'video', 'link'] as const)
  type: 'pdf' | 'video' | 'link';
}

export class ProgramLessonDto implements ProgramLesson {
  @ApiProperty({ description: 'Lesson unique ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Lesson order in the program', minimum: 1 })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Lesson duration in minutes', minimum: 1 })
  @IsNumber()
  @Min(1)
  duration_minutes: number;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiPropertyOptional({ description: 'Attached resources', type: [ProgramResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramResourceDto)
  resources?: ProgramResourceDto[];

  @ApiPropertyOptional({ description: 'Is free preview available', default: false })
  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Program DTO
// ─────────────────────────────────────────────────────────────────────────────

export class CreateProgramDto {
  @ApiProperty({ description: 'Program title', maxLength: 255 })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProgramType, description: 'Program type' })
  @IsEnum(ProgramType)
  type: ProgramType;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cover_image?: string;

  @ApiProperty({ description: 'Program price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'USD';

  @ApiProperty({ description: 'Program duration in weeks', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Max(104)
  duration_weeks: number;

  @ApiProperty({ description: 'Program lessons', type: [ProgramLessonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramLessonDto)
  lessons: ProgramLessonDto[];

  @ApiProperty({ enum: ProgramDifficulty, description: 'Difficulty level' })
  @IsEnum(ProgramDifficulty)
  difficulty: ProgramDifficulty;

  @ApiPropertyOptional({ description: 'Prerequisites', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'Expected outcomes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];

  @ApiPropertyOptional({ description: 'Is program published', default: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Program DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

// ─────────────────────────────────────────────────────────────────────────────
// Enroll DTO
// ─────────────────────────────────────────────────────────────────────────────

export class EnrollProgramDto {
  @ApiProperty({ description: 'User ID to enroll' })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({ description: 'Payment transaction ID' })
  @IsOptional()
  @IsString()
  payment_transaction_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Progress DTO
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateProgressDto {
  @ApiProperty({ description: 'Lesson ID completed' })
  @IsUUID()
  lesson_id: string;

  @ApiPropertyOptional({ description: 'Current progress percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percent?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class SearchProgramsDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ProgramType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(ProgramType)
  type?: ProgramType;

  @ApiPropertyOptional({ enum: ProgramDifficulty, description: 'Filter by difficulty' })
  @IsOptional()
  @IsEnum(ProgramDifficulty)
  difficulty?: ProgramDifficulty;

  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  @IsOptional()
  @IsUUID()
  creator_id?: string;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class CreatorProgramResponseDto {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  type: ProgramType;
  cover_image: string | null;
  price: number;
  currency: string;
  duration_weeks: number;
  lessons_count: number;
  lessons: ProgramLesson[];
  difficulty: ProgramDifficulty;
  requirements: string[];
  outcomes: string[];
  is_published: boolean;
  rating: number;
  enrollment_count: number;
  completion_count: number;
  created_at: Date;
  updated_at: Date;
}

export class ProgramEnrollmentResponseDto {
  id: string;
  program_id: string;
  user_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  current_lesson_id: string | null;
  completed_lessons: string[];
  started_at: Date | null;
  completed_at: Date | null;
  purchase_price: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}
