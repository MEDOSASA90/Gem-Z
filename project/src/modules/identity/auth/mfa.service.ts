/**
 * ============================================================================
 * GEM Z - Identity Module
 * MFAService - خدمة المصادقة متعددة العوامل
 * ============================================================================
 * تدعم: TOTP (Google Authenticator), SMS, Email
 * - توليد secrets مشفرة
 * - QR codes لـ TOTP
 - رموز استرداد
 * - ارسال رموز مؤقتة عبر SMS/Email
 * ============================================================================
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as OTPAuth from 'otpauth';

/** نتيجة اعداد MFA */
interface MFASetupResult {
  secret: string;
  qrCodeUri: string;
  recoveryCodes: string[];
}

/** نتيجة التحقق من MFA */
interface MFAVerifyResult {
  verified: boolean;
  remainingAttempts: number;
}

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);
  /** مُصدر TOTP */
  private readonly TOTP_ISSUER = process.env.MFA_ISSUER ?? 'GEMZ';
  /** عدد المحاولات المسموح */
  private readonly MAX_ATTEMPTS = 5;
  /** فترة صلاحية رمز SMS/Email (بالثواني) */
  private readonly CODE_TTL = 10 * 60; // 10 دقائق
  /** طول رمز MFA */
  private readonly CODE_LENGTH = 6;

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  /**
   * اعداد MFA للمستخدم
   * @param userId - معرف المستخدم
   * @param method - طريقة MFA
   * @returns secret + QR code + recovery codes
   */
  async setup(userId: string, method: 'sms' | 'email' | 'totp'): Promise<MFASetupResult> {
    switch (method) {
      case 'totp':
        return this.setupTOTP(userId);
      case 'sms':
        return this.setupSMS(userId);
      case 'email':
        return this.setupEmail(userId);
      default:
        throw new BadRequestException('طريقة MFA غير مدعومة');
    }
  }

  /**
   * التحقق من رمز MFA
   * @param userId - معرف المستخدم
   * @param code - الرمز المراد التحقق منه
   * @param method - طريقة MFA
   * @param secret - الـ secret المخزن (مطلوب لـ TOTP)
   */
  async verify(
    userId: string,
    code: string,
    method: 'sms' | 'email' | 'totp',
    secret?: string,
  ): Promise<MFAVerifyResult> {
    const attemptKey = `mfa:attempts:${userId}:${method}`;
    const attempts = parseInt((await this.redis.get(attemptKey)) ?? '0', 10);

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new BadRequestException('تم تجاوز الحد الاقصى للمحاولات. يرجى المحاولة لاحقاً');
    }

    let verified = false;

    switch (method) {
      case 'totp':
        if (!secret) throw new BadRequestException('TOTP secret مطلوب');
        verified = this.verifyTOTP(secret, code);
        break;
      case 'sms':
      case 'email':
        verified = await this.verifyCode(userId, method, code);
        break;
    }

    if (verified) {
      // مسح عدد المحاولات عند النجاح
      await this.redis.del(attemptKey);
      return { verified: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    // زيادة عدد المحاولات
    const newAttempts = attempts + 1;
    await this.redis.setex(attemptKey, 3600, String(newAttempts)); // تنتهي بعد ساعة
    return { verified: false, remainingAttempts: this.MAX_ATTEMPTS - newAttempts };
  }

  /** توليد secret جديد لـ TOTP */
  generateSecret(): string {
    return new OTPAuth.Secret({ size: 32 }).base32;
  }

  /** ارسال رمز MFA (SMS او Email) */
  async sendCode(userId: string, method: 'sms' | 'email'): Promise<{ code: string; ttl: number }> {
    const code = this.generateNumericCode(this.CODE_LENGTH);
    const codeHash = this.hashCode(code);

    // تخزين الـ hash في Redis (لا نخزن الرمز نفسه)
    const key = `mfa:code:${userId}:${method}`;
    await this.redis.setex(key, this.CODE_TTL, codeHash);

    // TODO: ارسال الرمز الفعلي عبر SMS/Email
    this.logger.log(`MFA ${method.toUpperCase()} code sent to user ${userId}`);

    return { code, ttl: this.CODE_TTL };
  }

  /** التحقق من وجود اعداد MFA للمستخدم */
  async hasMFASetup(userId: string, method: 'sms' | 'email' | 'totp'): Promise<boolean> {
    const key = `mfa:setup:${userId}:${method}`;
    return (await this.redis.exists(key)) === 1;
  }

  /** الغاء اعداد MFA */
  async disableMFA(userId: string, method: 'sms' | 'email' | 'totp'): Promise<void> {
    await this.redis.del(`mfa:setup:${userId}:${method}`);
    this.logger.log(`MFA ${method} disabled for user ${userId}`);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private setupTOTP(userId: string): MFASetupResult {
    const secret = this.generateSecret();
    const totp = new OTPAuth.TOTP({
      issuer: this.TOTP_ISSUER,
      label: `${this.TOTP_ISSUER}:${userId}`,
      algorithm: 'SHA256',
      digits: this.CODE_LENGTH,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const qrCodeUri = totp.toString();
    const recoveryCodes = this.generateRecoveryCodes(8);

    return { secret, qrCodeUri, recoveryCodes };
  }

  private async setupSMS(userId: string): Promise<MFASetupResult> {
    const { code } = await this.sendCode(userId, 'sms');
    return { secret: '', qrCodeUri: '', recoveryCodes: [] };
  }

  private async setupEmail(userId: string): Promise<MFASetupResult> {
    const { code } = await this.sendCode(userId, 'email');
    return { secret: '', qrCodeUri: '', recoveryCodes: [] };
  }

  private verifyTOTP(secret: string, code: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: this.TOTP_ISSUER,
        algorithm: 'SHA256',
        digits: this.CODE_LENGTH,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // قبول النافذة السابقة والحالية والتالية (±30 ثانية)
      const result = totp.validate({ token: code, window: 1 });
      return result !== null;
    } catch {
      return false;
    }
  }

  private async verifyCode(
    userId: string,
    method: 'sms' | 'email',
    code: string,
  ): Promise<boolean> {
    const key = `mfa:code:${userId}:${method}`;
    const storedHash = await this.redis.get(key);
    if (!storedHash) return false;

    const inputHash = this.hashCode(code);
    // timing-safe comparison لمنع timing attacks
    const match = timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));

    if (match) {
      // حذف الرمز بعد الاستخدام (one-time)
      await this.redis.del(key);
    }

    return match;
  }

  private generateNumericCode(length: number): string {
    const digits = '0123456789';
    let result = '';
    const randomValues = randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += digits[randomValues[i] % 10];
    }
    return result;
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const bytes = randomBytes(5);
      // تنسيق: XXXX-XXXX-XXXX
      const hex = bytes.toString('hex').toUpperCase();
      codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`);
    }
    return codes;
  }
}
