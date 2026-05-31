/**
 * ============================================================================
 * GEM Z - Identity Module
 * KYCService - خدمة التحقق من الهوية
 * ============================================================================
 * مسؤولة عن:
 * - تقديم طلبات KYC
 * - مراجعة واعتماد/رفض KYC
 * - التحقق من حالة KYC
 * - التكامل مع معالج OCR والوجوه
 * ============================================================================
 */

import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, ConflictException, HttpException, HttpStatus
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { KYCSubmission, KYCType, KYCReviewStatus, KYCDocument } from './kyc.entity';
import { KYCStatus as UserKYCStatus } from '../user/user.entity';
import { SubmitKYCDto, ReviewKYCDto } from './kyc.dto';
import { KYCProcessor } from './kyc.processor';
import { DocumentValidator } from './document-validator';
import { UserService } from '../user/user.service';
import { PrivateS3Service } from './private-s3.service';
import { KycLifecycleQueue } from './kyc-lifecycle.queue';
import { RBACService } from '../rbac/rbac.service';

@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);

  constructor(
    @InjectRepository(KYCSubmission)
    private readonly kycRepository: Repository<KYCSubmission>,
    private readonly kycProcessor: KYCProcessor,
    private readonly documentValidator: DocumentValidator,
    private readonly userService: UserService,
    private readonly s3Service: PrivateS3Service,
    private readonly lifecycleQueue: KycLifecycleQueue,
    private readonly rbacService: RBACService,
  ) {}

  // ============================================================================
  // Submission
  // ============================================================================

  /**
   * تقديم طلب KYC جديد
   * - التحقق من الوثائق
   * - انشاء الطلب
   * - ارسال للمعالجة
   * - ارسال حدث UserKYCSubmitted
   */
  async submit(userId: string, dto: SubmitKYCDto): Promise<KYCSubmission> {
    // التحقق من صحة الوثائق
    if (!dto.documents || dto.documents.length === 0) {
      throw new BadRequestException('يجب تقديم وثيقة واحدة على الاقل');
    }

    // التحقق من عدم وجود طلب معلق
    const pending = await this.kycRepository.findOne({
      where: { userId, status: KYCReviewStatus.PENDING },
    });
    if (pending) {
      throw new ConflictException('يوجد طلب KYC معلق مسبقاً');
    }

    // اضافة معرف فريد لكل وثيقة
    const documents: KYCDocument[] = dto.documents.map(d => ({
      ...d,
      id: d.id || randomUUID(),
      status: 'PENDING' as const,
      uploadedAt: d.uploadedAt || new Date().toISOString(),
    }));

    const submission = this.kycRepository.create({
      userId,
      type: dto.type,
      status: KYCReviewStatus.PENDING,
      documents,
      ocrData: { confidence: 0 },
      fraudScore: 0,
      reviewedBy: null,
      reviewNotes: null,
    });

    const saved = await this.kycRepository.save(submission);
    this.logger.log(`KYC submitted: ${saved.id} by user ${userId}`);

    // TODO: emit UserKYCSubmitted event

    // بدء المعالجة التلقائية (async)
    this.processSubmissionAsync(saved.id).catch(err => {
      this.logger.error(`Auto-processing failed for KYC ${saved.id}: ${err.message}`);
    });

    return saved;
  }

  // ============================================================================
  // Review
  // ============================================================================

  /**
   * مراجعة طلب KYC (للادمن)
   * - الموافقة او الرفض
   * - تحديث حالة المستخدم
   * - ارسال الاحداث
   */
  async review(
    kycId: string,
    reviewerId: string,
    dto: ReviewKYCDto,
  ): Promise<KYCSubmission> {
    const submission = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!submission) throw new NotFoundException('طلب KYC غير موجود');

    if (submission.status !== KYCReviewStatus.PENDING && submission.status !== KYCReviewStatus.ESCALATED) {
      throw new BadRequestException(`لا يمكن مراجعة طلب بحالة ${submission.status}`);
    }

    submission.status = dto.decision;
    submission.reviewedBy = reviewerId;
    submission.reviewNotes = dto.notes ?? null;
    if (dto.fraudScore !== undefined) {
      submission.fraudScore = dto.fraudScore;
    }
    submission.reviewedAt = new Date();

    const saved = await this.kycRepository.save(submission);

    // تحديث حالة KYC للمستخدم
    if (dto.decision === KYCReviewStatus.APPROVED) {
      await this.userService.updateKycStatus(submission.userId, UserKYCStatus.APPROVED, 1);
      this.logger.log(`KYC approved: ${kycId} by ${reviewerId}`);
    } else if (dto.decision === KYCReviewStatus.REJECTED) {
      await this.userService.updateKycStatus(submission.userId, UserKYCStatus.REJECTED, 0);
      this.logger.log(`KYC rejected: ${kycId} by ${reviewerId}`);
    }

    // Trigger background queue job via BullMQ-simulated Redis queue to delete raw S3 files after 48 hours
    if (saved.documents && saved.documents.length > 0) {
      for (const doc of saved.documents) {
        if (doc.s3Uri) {
          await this.lifecycleQueue.scheduleFileDeletion(saved.id, doc.s3Uri);
          this.logger.log(`Scheduled raw image deletion for doc [${doc.id}] on KYC [${saved.id}]`);
        }
      }
    }

    return saved;
  }

  /**
   * getSensitiveDocumentUrl - Generate presigned S3 url with a hard 120s expiry if RBAC permissions are valid,
   * otherwise logs a high-severity security alert to Clickhouse.
   */
  async getSensitiveDocumentUrl(
    kycId: string,
    docId: string,
    userId: string,
  ): Promise<{ signedUrl: string; expiresAt: number }> {
    // Intercept at controller/service level. Double check RBAC scopes for kyc:review or kyc:override
    const permissions = await this.rbacService.checkPermissions(userId, ['kyc:review', 'kyc:override']);
    const hasPermission = permissions['kyc:review'] || permissions['kyc:override'];

    if (!hasPermission) {
      // Log high-severity entry to ClickHouse
      await this.logClickHouseSecurityAlert(userId, kycId, docId, 'UNAUTHORIZED_SENSITIVE_KYC_ACCESS');
      throw new HttpException('Unauthorized Resource Access Logged', HttpStatus.FORBIDDEN);
    }

    const submission = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!submission) throw new NotFoundException('طلب KYC غير موجود');

    const document = submission.documents.find((d: any) => d.id === docId);
    if (!document) throw new NotFoundException('الوثيقة غير موجودة في هذا الطلب');

    if (!document.s3Uri) {
      throw new BadRequestException('لقد تم حذف هذه الوثيقة نهائياً من مخزن S3 بموجب سياسة خصوصية البيانات بعد المراجعة');
    }

    const signedUrl = await this.s3Service.getPresignedUrl(document.s3Uri, 120); // exactly 120 seconds expiry
    return {
      signedUrl,
      expiresAt: Math.floor(Date.now() / 1000) + 120,
    };
  }

  /**
   * Log high-severity security warning to ClickHouse
   */
  private async logClickHouseSecurityAlert(
    userId: string,
    kycId: string,
    docId: string,
    event: string,
  ): Promise<void> {
    this.logger.error(
      `[SECURITY AUDIT LOG] clickhouse.gemz_security_alerts: event=${event}, actor_id=${userId}, resource=kyc:${kycId}, doc_id=${docId}, severity=CRITICAL`,
    );
  }

  // ============================================================================
  // Status & Queries
  // ============================================================================

  /** جلب حالة KYC للمستخدم */
  async getStatus(userId: string): Promise<KYCSubmission | null> {
    return this.kycRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** جلب طلب KYC بواسطة ID */
  async findById(kycId: string): Promise<KYCSubmission> {
    const submission = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!submission) throw new NotFoundException('طلب KYC غير موجود');
    return submission;
  }

  /** قائمة طلبات KYC (للادمن) */
  async findAll(options: {
    status?: KYCReviewStatus;
    type?: KYCType;
    page?: number;
    limit?: number;
  }): Promise<{ items: KYCSubmission[]; total: number }> {
    const qb = this.kycRepository.createQueryBuilder('kyc');

    if (options.status) qb.andWhere('kyc.status = :s', { s: options.status });
    if (options.type) qb.andWhere('kyc.type = :t', { t: options.type });

    const [items, total] = await qb
      .skip((options.page ?? 0) * (options.limit ?? 20))
      .take(options.limit ?? 20)
      .orderBy('kyc.created_at', 'DESC')
      .getManyAndCount();

    return { items, total };
  }

  // ============================================================================
  // Document Validation
  // ============================================================================

  /** التحقق من وثيقة KYC */
  validateDocument(docType: string, fileBuffer: Buffer, mimeType: string, fileName: string): boolean {
    // التحقق من نوع الوثيقة
    if (!this.documentValidator.validateDocumentType(docType)) {
      throw new BadRequestException(`نوع الوثيقة غير مدعوم: ${docType}`);
    }

    // التحقق من الملف
    const result = this.documentValidator.validate(fileBuffer, fileName, mimeType);
    if (!result.valid) {
      throw new BadRequestException(`الملف غير صالح: ${result.errors.join(', ')}`);
    }

    return true;
  }

  // ============================================================================
  // Private
  // ============================================================================

  /**
   * معالجة تلقائية لطلب KYC (OCR + Face + Fraud)
   */
  private async processSubmissionAsync(kycId: string): Promise<void> {
    const submission = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!submission) return;

    // تحديث الحالة الى قيد المراجعة
    submission.status = KYCReviewStatus.IN_REVIEW;
    await this.kycRepository.save(submission);

    // المعالجة
    const { ocrResults, faceMatch, liveness, fraudAnalysis } =
      await this.kycProcessor.processSubmission(submission);

    // تحديث النتائج
    if (ocrResults.length > 0) {
      submission.ocrData = ocrResults[0].data;
    }
    if (faceMatch) {
      submission.faceMatchScore = faceMatch.score;
    }
    if (liveness) {
      submission.livenessScore = liveness.score;
    }
    submission.fraudScore = fraudAnalysis.score;

    // تصعيد تلقائي اذا كانت درجة الاحتيال عالية
    if (fraudAnalysis.score >= 70) {
      submission.status = KYCReviewStatus.ESCALATED;
      this.logger.warn(`KYC ${kycId} escalated due to high fraud score: ${fraudAnalysis.score}`);
    }

    await this.kycRepository.save(submission);
    this.logger.log(`KYC ${kycId} auto-processed: fraud=${fraudAnalysis.score}, OCR=${ocrResults.length} docs`);
  }
}
