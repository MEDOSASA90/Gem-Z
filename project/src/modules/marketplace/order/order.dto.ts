import { IsUUID, IsNumber, IsEnum, IsString, IsOptional, IsArray, ValidateNested, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, OrderStatus } from '../../../common/enums';
import { OrderAddress } from './order.entity';

// ============================================================================
// Order Item DTO
// ============================================================================

/**
 * DTO لعنصر في الطلب
 */
export class OrderItemDto {
  @ApiProperty({ description: 'معرف المنتج' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({ description: 'اسم المنتج' })
  @IsString()
  product_name!: string;

  @ApiPropertyOptional({ description: 'صورة المنتج' })
  @IsOptional()
  @IsString()
  product_image?: string;

  @ApiProperty({ description: 'الكمية', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ description: 'السعر لكل وحدة' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unit_price!: number;

  @ApiProperty({ description: 'السعر الإجمالي' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  total_price!: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;
}

// ============================================================================
// Order DTOs
// ============================================================================

/**
 * DTO لإنشاء طلب
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'معرف المشتري' })
  @IsUUID()
  buyer_id!: string;

  @ApiProperty({ description: 'معرف البائع' })
  @IsUUID()
  seller_id!: string;

  @ApiPropertyOptional({ description: 'معرف المتجر' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ description: 'عناصر الطلب', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ description: 'عنوان الشحن' })
  @IsObject()
  shipping_address!: OrderAddress;

  @ApiProperty({ description: 'عنوان الفوترة' })
  @IsObject()
  billing_address!: OrderAddress;

  @ApiPropertyOptional({ description: 'تكلفة الشحن', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shipping_cost?: number;

  @ApiPropertyOptional({ description: 'مبلغ الضريبة', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tax_amount?: number;

  @ApiPropertyOptional({ description: 'مبلغ الخصم', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث حالة الطلب
 */
export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO للرد بطلب
 */
export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buyer_id!: string;

  @ApiProperty()
  seller_id!: string;

  @ApiProperty()
  status!: OrderStatus;

  @ApiProperty()
  payment_status!: string;

  @ApiProperty()
  fulfillment_status!: string;

  @ApiProperty()
  currency!: Currency;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shipping_cost!: number;

  @ApiProperty()
  tax_amount!: number;

  @ApiProperty()
  discount_amount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}

/**
 * DTO لتصفية الطلبات
 */
export class OrderFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyer_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seller_id?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
