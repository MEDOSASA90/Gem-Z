import { IsUUID, IsEnum, IsNumber, IsString, IsOptional, IsObject, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, WalletType, TransactionType, TransactionStatus } from '../../../common/enums';

// ============================================================================
// Wallet DTOs
// ============================================================================

/**
 * DTO لإنشاء محفظة جديدة
 */
export class CreateWalletDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ enum: Currency, description: 'العملة', example: Currency.EGP })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiPropertyOptional({ enum: WalletType, default: WalletType.CONSUMER })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;
}

/**
 * DTO للرد ببيانات المحفظة
 */
export class WalletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  user_id!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ type: 'number', example: 1500.5 })
  balance!: number;

  @ApiProperty({ type: 'number', example: 0 })
  held_balance!: number;

  @ApiProperty({ type: 'number', example: 1500.5 })
  available_balance!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  snapshot_version!: number;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}

// ============================================================================
// Deposit/Withdraw/Transfer DTOs
// ============================================================================

/**
 * DTO لإيداع مبلغ في المحفظة
 */
export class DepositDto {
  @ApiProperty({ description: 'المبلغ المراد إيداعه', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'معرف المرجع', required: false })
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @ApiProperty({ description: 'نوع المرجع', required: false })
  @IsOptional()
  @IsString()
  reference_type?: string;

  @ApiProperty({ description: 'وصف الإيداح' })
  @IsString()
  description!: string;
}

/**
 * DTO للسحب من المحفظة
 */
export class WithdrawDto {
  @ApiProperty({ description: 'المبلغ المراد سحبه', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'معرف المرجع', required: false })
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @ApiProperty({ description: 'نوع المرجع', required: false })
  @IsOptional()
  @IsString()
  reference_type?: string;

  @ApiProperty({ description: 'وصف السحب' })
  @IsString()
  description!: string;
}

/**
 * DTO للتحويل بين محفظتين
 */
export class TransferDto {
  @ApiProperty({ description: 'معرف المحفظة المصدر' })
  @IsUUID()
  from_wallet_id!: string;

  @ApiProperty({ description: 'معرف المحفظة الوجهة' })
  @IsUUID()
  to_wallet_id!: string;

  @ApiProperty({ description: 'المبلغ', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'وصف التحويل' })
  @IsString()
  description!: string;
}

/**
 * DTO لتجميد/فك تجميد المحفظة
 */
export class FreezeWalletDto {
  @ApiProperty({ description: 'سبب التجميد' })
  @IsString()
  reason!: string;
}

// ============================================================================
// Transaction DTOs
// ============================================================================

/**
 * DTO لتسجيل معاملة جديدة
 */
export class RecordTransactionDto {
  @ApiProperty()
  @IsUUID()
  wallet_id!: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_type?: string;

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO لعكس معاملة
 */
export class ReverseTransactionDto {
  @ApiProperty({ description: 'سبب الإعكاس' })
  @IsString()
  reason!: string;
}

/**
 * DTO لقيود الدفتر
 */
export class PostLedgerEntryDto {
  @ApiProperty()
  @IsUUID()
  transaction_id!: string;

  @ApiProperty({ enum: ['DEBIT', 'CREDIT'] })
  @IsIn(['DEBIT', 'CREDIT'])
  entry_type!: 'DEBIT' | 'CREDIT';

  @ApiProperty({ description: 'الحساب (مثال: wallet:uuid, escrow:uuid)' })
  @IsString()
  account!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO لتصفية المعاملات
 */
export class TransactionFiltersDto {
  @ApiProperty({ enum: TransactionType, required: false })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({ enum: TransactionStatus, required: false })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference_type?: string;

  @ApiProperty({ required: false, description: 'تاريخ البدء' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiProperty({ required: false, description: 'تاريخ الانتهاء' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

/**
 * DTO لإنشاء قيدي دفتر (مدين + دائن)
 */
export class CreateDoubleEntryDto {
  @ApiProperty()
  transaction_id!: string;

  @ApiProperty()
  debit_account!: string;

  @ApiProperty()
  credit_account!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ required: false })
  description?: string;
}
