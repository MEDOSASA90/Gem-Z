/**
 * ============================================================================
 * GEM Z - Identity Module
 * KYCController - متحكم التحقق من الهوية
 * ============================================================================
 */

import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KYCService } from './kyc.service';
import {
  SubmitKYCDto, ReviewKYCDto, UploadKYCDocumentDto,
  KYCSubmissionResponseDto, KYCStatusResponseDto, DocumentUploadResponseDto,
} from './kyc.dto';
import { KYCReviewStatus, KYCType } from './kyc.entity';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthWithPermissions } from '../rbac/rbac.decorator';

@ApiTags('KYC')
@ApiBearerAuth()
@Controller('kyc')
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  // ============================================================================
  // User Endpoints
  // ============================================================================

  @Post('submit')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تقديم طلب KYC' })
  @ApiResponse({ status: 201, type: KYCSubmissionResponseDto })
  async submit(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKYCDto,
  ): Promise<KYCSubmissionResponseDto> {
    const submission = await this.kycService.submit(userId, dto);
    return submission as unknown as KYCSubmissionResponseDto;
  }

  @Get('status')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'الاستعلام عن حالة KYC' })
  @ApiResponse({ status: 200, type: KYCStatusResponseDto })
  async getStatus(@CurrentUser('id') userId: string): Promise<KYCStatusResponseDto | { status: string }> {
    const submission = await this.kycService.getStatus(userId);
    if (!submission) return { status: 'NOT_SUBMITTED' };
    return {
      userId: submission.userId,
      status: submission.status,
      type: submission.type,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt ?? undefined,
    };
  }

  @Post('documents/upload')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'رفع وثيقة KYC (يوقع URL مؤقت)' })
  @ApiResponse({ status: 200, type: DocumentUploadResponseDto })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadKYCDocumentDto,
  ): Promise<DocumentUploadResponseDto> {
    // انشاء URL موقع مؤقت للرفع (Presigned URL)
    // TODO: Integration with AWS S3 / MinIO for presigned URLs
    const documentId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 دقيقة

    return {
      documentId,
      uploadUrl: `/v1/kyc/documents/upload/${documentId}`, // Placeholder
      expiresAt,
    };
  }

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  @Get('submissions')
  @AuthWithPermissions('kyc:review')
  @ApiOperation({ summary: 'قائمة طلبات KYC (ادمن)' })
  @ApiResponse({ status: 200, type: [KYCSubmissionResponseDto] })
  async findAll(
    @Query('status') status?: KYCReviewStatus,
    @Query('type') type?: KYCType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ items: KYCSubmissionResponseDto[]; total: number }> {
    return this.kycService.findAll({ status, type, page, limit }) as Promise<{
      items: KYCSubmissionResponseDto[]; total: number;
    }>;
  }

  @Get('submissions/:id')
  @AuthWithPermissions('kyc:review')
  @ApiOperation({ summary: 'تفاصيل طلب KYC (ادمن)' })
  @ApiResponse({ status: 200, type: KYCSubmissionResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<KYCSubmissionResponseDto> {
    const submission = await this.kycService.findById(id);
    return submission as unknown as KYCSubmissionResponseDto;
  }

  @Put('submissions/:id/review')
  @AuthWithPermissions('kyc:review')
  @ApiOperation({ summary: 'مراجعة طلب KYC (ادمن)' })
  @ApiResponse({ status: 200, type: KYCSubmissionResponseDto })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewKYCDto,
  ): Promise<KYCSubmissionResponseDto> {
    const submission = await this.kycService.review(id, reviewerId, dto);
    return submission as unknown as KYCSubmissionResponseDto;
  }
}
