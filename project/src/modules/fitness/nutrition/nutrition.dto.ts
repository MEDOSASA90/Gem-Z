/**
 * DTOs للتغذية وخطط الوجبات
 */
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  IsBoolean,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MealItemDto {
  @ApiProperty() @IsString() food: string;
  @ApiProperty() @IsNumber() @Min(0) quantity: number;
  @ApiProperty() @IsString() unit: string;
  @ApiProperty() @IsNumber() @Min(0) calories: number;
  @ApiProperty() @IsNumber() @Min(0) protein: number;
  @ApiProperty() @IsNumber() @Min(0) carbs: number;
  @ApiProperty() @IsNumber() @Min(0) fat: number;
}

export class MealDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ type: [MealItemDto] }) @IsArray() items: MealItemDto[];
}

export class CreateMealPlanDto {
  @ApiProperty({ description: 'العنوان' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'الوصف' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'الوجبات' })
  @IsOptional()
  @IsObject()
  meals?: Record<string, MealDto>;

  @ApiPropertyOptional({ description: 'هدف السعرات' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories_target?: number;

  @ApiPropertyOptional({ description: 'هدف البروتين' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein_target?: number;

  @ApiPropertyOptional({ description: 'هدف الكربوهيدرات' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs_target?: number;

  @ApiPropertyOptional({ description: 'هدف الدهون' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat_target?: number;

  @ApiPropertyOptional({ description: 'قيود غذائية' })
  @IsOptional()
  @IsArray()
  dietary_restrictions?: string[];
}

export class UpdateMealPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() meals?: Record<string, MealDto>;
  @ApiPropertyOptional() @IsOptional() @IsNumber() calories_target?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() protein_target?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() carbs_target?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fat_target?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() dietary_restrictions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class LogMealDto {
  @ApiProperty({ description: 'نوع الوجبة (breakfast, lunch, dinner, snack)' })
  @IsString()
  meal_type: string;

  @ApiProperty({ description: 'تاريخ الوجبة (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'العناصر الغذائية' })
  @IsArray()
  items: MealItemDto[];

  @ApiPropertyOptional({ description: 'إجمالي السعرات' })
  @IsOptional()
  @IsNumber()
  total_calories?: number;
}
