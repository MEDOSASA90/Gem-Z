/**
 * QRService - خدمة إنشاء والتحقق من أكواد QR
 * تستخدم JWT-based QR codes مع expiry 5 دقائق
 */
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/** حمولة (Payload) QR code */
interface QRCodePayload {
  sub: string;        // user_id
  gym: string;        // gym_id
  iat: number;        // issued at
  exp: number;        // expiry (5 min)
  type: 'check_in' | 'membership_card';
  jti: string;        // unique token id
}

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);
  /** مدة صلاحية QR code بالثواني (5 دقائق) */
  private readonly QR_EXPIRY_SECONDS = 300;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * إنشاء QR code للـ Check-in
   * - JWT token يحتوي user_id + gym_id
   - صلاحية 5 دقائق فقط
   */
  async generateCheckInCode(userId: string, gymId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: QRCodePayload = {
      sub: userId,
      gym: gymId,
      iat: now,
      exp: now + this.QR_EXPIRY_SECONDS,
      type: 'check_in',
      jti: `${userId}:${gymId}:${now}:${crypto.randomUUID()}`,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_QR_SECRET'),
      expiresIn: `${this.QR_EXPIRY_SECONDS}s`,
    });

    this.logger.debug(`Generated QR check-in code for user ${userId} at gym ${gymId}`);
    return token;
  }

  /**
   * التحقق من QR code
   * - فك التشفير
   * - التحقق من الـ expiry
   * - التحقق من التوقيع
   */
  async validateCode(code: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify<QRCodePayload>(code, {
        secret: this.configService.get<string>('JWT_QR_SECRET'),
        clockTolerance: 30, // 30 ثانية مرونة
      });

      // التحقق من النوع
      if (payload.type !== 'check_in') {
        this.logger.warn(`Invalid QR type: ${payload.type}`);
        return false;
      }

      // التحقق من عدم انتهاء الصلاحية
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        this.logger.warn(`Expired QR code for user ${payload.sub}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.warn(`QR validation failed: ${err instanceof Error ? err.message : 'unknown'}`);
      return false;
    }
  }

  /**
   * فك QR code والحصول على البيانات (بعد التحقق)
   */
  async decodeCode(code: string): Promise<{ userId: string; gymId: string } | null> {
    try {
      const payload = this.jwtService.verify<QRCodePayload>(code, {
        secret: this.configService.get<string>('JWT_QR_SECRET'),
      });
      return { userId: payload.sub, gymId: payload.gym };
    } catch {
      return null;
    }
  }

  /**
   * إنشاء بطاقة عضوية رقمية
   * - JWT طويل الأمد (1 سنة)
   * - يحتوي بيانات العضو
   */
  async generateMembershipCard(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'membership_card',
      iat: Math.floor(Date.now() / 1000),
      // بطاقة العضوية صالحة لسنة
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_MEMBERSHIP_SECRET'),
    });
  }
}
