/**
 * ============================================================================
 * GEM Z - Identity Module
 * KYC Entity - كيان التحقق من الهوية (Know Your Customer)
 * ============================================================================
 */

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';

/** انواع KYC */
export enum KYCType {
  USER_KYC = 'USER_KYC',
  GYM_KYC = 'GYM_KYC',
  STORE_KYC = 'STORE_KYC',
  TRAINER_KYC = 'TRAINER_KYC',
  CORPORATE_KYC = 'CORPORATE_KYC',
}

/** حالات مراجعة KYC */
export enum KYCReviewStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/** وثيقة KYC المرفقة */
export interface KYCDocument {
  id: string;
  type: string;           // passport, national_id, license, etc.
  url: string;            // رابط الوثيقة (encrypted at rest + signed URL)
  s3Uri?: string;         // private S3 path
  deletedFromS3?: boolean;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt: string;     // ISO 8601
  metadata?: Record<string, unknown>;
}

/** نتيجة OCR */
export interface OCRResult {
  documentNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  expiryDate?: string;
  confidence: number;
  rawText?: string;
}

/** كيان KYC Submission */
@Entity('kyc_submissions')
@Index(['userId'])
@Index(['status'])
@Index(['type'])
export class KYCSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'simple-enum', enum: KYCType, nullable: false })
  type: KYCType;

  @Column({ type: 'simple-enum', enum: KYCReviewStatus, default: KYCReviewStatus.PENDING })
  status: KYCReviewStatus;

  /** الوثائق المرفقة (JSONB) */
  @Column({ type: 'simple-json', nullable: true })
  documents: KYCDocument[];

  /** بيانات OCR المستخرجة */
  @Column({ name: 'ocr_data', type: 'simple-json', nullable: true })
  ocrData: OCRResult;

  /** درجة تطابق الوجه (0-100) */
  @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  faceMatchScore: number | null;

  /** درجة الحيوية (0-100) */
  @Column({ name: 'liveness_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  livenessScore: number | null;

  /** درجة الاحتيال (0-100) */
  @Column({ name: 'fraud_score', type: 'int', default: 0 })
  fraudScore: number;

  /** من قام بالمراجعة */
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  /** ملاحظات المراجعة */
  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'submitted_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
