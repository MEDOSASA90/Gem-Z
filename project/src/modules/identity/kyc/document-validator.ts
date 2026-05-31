/**
 * ============================================================================
 * GEM Z - Identity Module
 * DocumentValidator - مدقق وثائق KYC
 * ============================================================================
 * يتحقق من صحة الوثائق المرفقة: الصيغة، الحجم، النوع
 * ============================================================================
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/** انواع الملفات المسموحة */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/** الصيغ المسموحة */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

/** الحد الاقصى لحجم الملف (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** الحد الادنى لابعاد الصورة */
const MIN_IMAGE_DIMENSION = 300;

/** الحد الاقصى لابعاد الصورة */
const MAX_IMAGE_DIMENSION = 8192;

/** نتيجة التحقق */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  mimeType: string;
  extension: string;
  size: number;
}

@Injectable()
export class DocumentValidator {
  private readonly logger = new Logger(DocumentValidator.name);

  /**
   * التحقق من وثيقة KYC
   * @param fileBuffer - محتوى الملف
   * @param originalName - الاسم الاصلي
   * @param mimeType - نوع MIME
   */
  validate(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): ValidationResult {
    const errors: string[] = [];

    // 1. التحقق من الحجم
    if (fileBuffer.length > MAX_FILE_SIZE) {
      errors.push(`حجم الملف يتجاوز الحد الاقصى (${MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }

    // 2. التحقق من نوع MIME
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      errors.push(`نوع الملف غير مدعوم: ${mimeType}`);
    }

    // 3. التحقق من الامتداد
    const extension = originalName.toLowerCase().slice(originalName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`امتداد الملف غير مدعوم: ${extension}`);
    }

    // 4. التحقق من ان الملف ليس فارغاً
    if (fileBuffer.length === 0) {
      errors.push('الملف فارغ');
    }

    // 5. فحص توقيع الملف (magic bytes) للتأكد من صحة النوع
    if (!this.verifyMagicBytes(fileBuffer, mimeType)) {
      errors.push('توقيع الملف غير متطابق مع النوع المعلن');
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      mimeType,
      extension,
      size: fileBuffer.length,
    };

    if (!result.valid) {
      this.logger.warn(`Document validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * التحقق من صحة نوع الوثيقة
   */
  validateDocumentType(documentType: string): boolean {
    const validTypes = [
      'passport', 'national_id', 'driving_license', 'residence_permit',
      'birth_certificate', 'utility_bill', 'bank_statement', 'selfie',
      'corporate_registration', 'tax_certificate',
    ];
    return validTypes.includes(documentType.toLowerCase());
  }

  /**
   * التحقق من توقيع الملف (magic bytes)
   * يمنع تزييف نوع الملف
   */
  private verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    };

    const expectedSigs = signatures[mimeType];
    if (!expectedSigs) return true; // نوع غير معروف نتركه يمر

    return expectedSigs.some(sig =>
      sig.every((byte, i) => buffer[i] === byte),
    );
  }
}
