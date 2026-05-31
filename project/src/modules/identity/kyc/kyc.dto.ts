/**
 * ============================================================================
 * GEM Z - Identity Module
 * KYC DTOs - كائنات نقل البيانات لـ KYC
 * ============================================================================
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsNumber, Min, Max,
  IsArray, ValidateNested, IsUrl, Length, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { KYCType, KYCReviewStatus, KYCDocument, OCRResult } from './kyc.entity';

// ============================================================================
// Document DTOs
// ============================================================================

export class KYCDocumentDto implements KYCDocument {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() @Length(1, 50) type: string;
  @ApiProperty() @IsUrl() url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  @ApiProperty() @IsString() uploadedAt: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

// ============================================================================
// Submission DTOs
// ============================================================================

export class SubmitKYCDto {
  @ApiProperty({ enum: KYCType }) @IsEnum(KYCType) type: KYCType;
  @ApiProperty({ type: [KYCDocumentDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => KYCDocumentDto) documents: KYCDocumentDto[];
}

export class ReviewKYCDto {
  @ApiProperty({ enum: KYCReviewStatus }) @IsEnum(KYCReviewStatus) decision: KYCReviewStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) fraudScore?: number;
}

// ============================================================================
// Upload DTOs
// ============================================================================

export class UploadKYCDocumentDto {
  @ApiProperty({ description: 'نوع الوثيقة', example: 'passport' })
  @IsString() @Length(1, 50) documentType: string;

  @ApiPropertyOptional({ description: 'البيانات الوصفية' })
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class KYCStatusResponseDto {
  @Expose() @ApiProperty() userId: string;
  @Expose() @ApiProperty({ enum: KYCReviewStatus }) status: KYCReviewStatus;
  @Expose() @ApiProperty() type: KYCType;
  @Expose() @ApiPropertyOptional() submittedAt?: Date;
  @Expose() @ApiPropertyOptional() reviewedAt?: Date;
}

export class KYCSubmissionResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() userId: string;
  @Expose() @ApiProperty() type: KYCType;
  @Expose() @ApiProperty({ enum: KYCReviewStatus }) status: KYCReviewStatus;
  @Expose() @ApiProperty({ type: [KYCDocumentDto] }) documents: KYCDocument[];
  @Expose() @ApiProperty() ocrData: OCRResult;
  @Expose() @ApiPropertyOptional() faceMatchScore?: number;
  @Expose() @ApiPropertyOptional() livenessScore?: number;
  @Expose() @ApiProperty() fraudScore: number;
  @Expose() @ApiPropertyOptional() reviewedBy?: string;
  @Expose() @ApiPropertyOptional() reviewNotes?: string;
  @Expose() @ApiProperty() submittedAt: Date;
  @Expose() @ApiPropertyOptional() reviewedAt?: Date;
  @Expose() @ApiProperty() createdAt: Date;
}

export class DocumentUploadResponseDto {
  @Expose() @ApiProperty() documentId: string;
  @Expose() @ApiProperty() uploadUrl: string;
  @Expose() @ApiProperty() expiresAt: Date;
}

export class KYCProcessingResultDto {
  @Expose() @ApiProperty() ocrData: OCRResult;
  @Expose() @ApiPropertyOptional() faceMatchScore?: number;
  @Expose() @ApiPropertyOptional() livenessScore?: number;
  @Expose() @ApiProperty() fraudScore: number;
  @Expose() @ApiProperty({ type: [String] }) alerts: string[];
}
