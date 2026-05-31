/**
 * ============================================================================
 * GEM Z - Identity Module
 * AuthService - خدمة المصادقة الرئيسية
 * ============================================================================
 * مسؤولة عن:
 * - تسجيل المستخدمين الجدد
 * - تسجيل الدخول والخروج
 * - انشاء والتحقق من JWT tokens
 * - تحديث Access Token عبر Refresh Token
 * - التكامل مع MFA و Device Fingerprinting
 * ============================================================================
 */

import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException,
  Logger, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { UserService } from '../user/user.service';
import { SessionService } from '../session/session.service';
import { MFAService } from './mfa.service';
import { User, UserStatus, KYCStatus } from '../user/user.entity';
import {
  RegisterDto, LoginDto, MFAVerifyDto, RefreshTokenDto, LogoutDto,
  LoginResponseDto, TokenPairDto, ForgotPasswordDto, ResetPasswordDto,
  DeviceInfoDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** مدة Access Token (بالثواني) - 15 دقيقة */
  private readonly ACCESS_EXPIRY = 15 * 60;
  /** مدة Refresh Token (بالثواني) - 7 ايام */
  private readonly REFRESH_EXPIRY = 7 * 24 * 60 * 60;
  /** حد المحاولات الفاشلة قبل الحظر */
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  /** فترة الحظر (بالثواني) - 30 دقيقة */
  private readonly LOCKOUT_DURATION = 30 * 60;

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MFAService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ============================================================================
  // Registration
  // ============================================================================

  /**
   * تسجيل مستخدم جديد
   * - يتحقق من عدم التكرار
   * - ينشئ المستخدم
   * - ينشئ Wallet
   * - يرسل حدث UserRegistered
   */
  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    // التحقق من وجود بريد مكرر
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('البريد الالكتروني مستخدم بالفعل');

    // انشاء المستخدم
    const user = await this.userService.create({
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      country: dto.country,
    });

    this.logger.log(`User registered: ${user.id} - ${user.email}`);

    // TODO: انشاء Wallet عبر Event Bus
    // TODO: ارسال حدث UserRegistered

    // انشاء tokens وجلسة
    const tokens = await this.generateTokens(user, dto.deviceInfo);
    return tokens;
  }

  // ============================================================================
  // Login
  // ============================================================================

  /**
   * تسجيل الدخول
   * - التحقق من الاحتراز ضد brute force
   * - التحقق من كلمة المرور
   * - التحقق من بصمة الجهاز
   * - التحقق من MFA
   * - انشاء جلسة وtokens
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const { email, password, deviceInfo } = dto;

    // فحص brute force protection
    await this.checkBruteForceProtection(email, deviceInfo.ip);

    // البحث عن المستخدم مع كلمة المرور
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) {
      await this.recordFailedAttempt(email, deviceInfo.ip);
      throw new UnauthorizedException('بيانات الاعتماد غير صالحة');
    }

    // التحقق من حالة المستخدم
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      throw new ForbiddenException('الحساب موقوف. تواصل مع الدعم');
    }

    // مقارنة كلمة المرور
    const valid = await this.userService.comparePassword(password, user.passwordHash);
    if (!valid) {
      await this.recordFailedAttempt(email, deviceInfo.ip);
      this.logger.warn(`Failed login attempt for ${email} from IP ${deviceInfo.ip}`);
      throw new UnauthorizedException('بيانات الاعتماد غير صالحة');
    }

    // مسح محاولات الفشل
    await this.clearFailedAttempts(email, deviceInfo.ip);

    // التحقق من بصمة الجهاز
    const isTrusted = await this.userService.isTrustedDevice(user.id, deviceInfo.fingerprint);
    const requiresMFA = !isTrusted || user.fraudScore > 50;

    if (requiresMFA) {
      // MFA مطلوب - انشاء token مؤقت
      const mfaToken = await this.createTemporaryMFAToken(user.id);
      return {
        accessToken: '',
        refreshToken: '',
        tokenType: 'Bearer',
        expiresIn: 0,
        user: this.mapToUserResponse(user),
        mfaRequired: true,
        mfaToken,
      };
    }

    // انشاء tokens وجلسة كاملة
    const result = await this.generateTokens(user, deviceInfo);

    // تحديث وقت آخر دخول
    await this.userService.updateLastLogin(user.id);

    // اضافة الجهاز كموثوق اذا كان جديداً
    if (!isTrusted) {
      await this.userService.addTrustedDevice(user.id, {
        fingerprint: deviceInfo.fingerprint,
        name: deviceInfo.userAgent ?? 'Unknown Device',
      });
    }

    this.logger.log(`User logged in: ${user.id} from ${deviceInfo.ip}`);
    // TODO: emit UserLoggedIn event

    return result;
  }

  // ============================================================================
  // Token Operations
  // ============================================================================

  /**
   * تحديث Access Token باستخدام Refresh Token
   * - التحقق من صلاحية Refresh Token
   * - الغاء الجلسة القديمة (token rotation)
   * - انشاء tokens جديدة
   */
  async refresh(dto: RefreshTokenDto): Promise<LoginResponseDto> {
    try {
      // فك تشفير Refresh Token
      const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string; type: string }>(
        dto.refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('نوع التوكن غير صالح');
      }

      // التحقق من Refresh Token في Redis
      const refreshHash = this.sessionService.hashToken(dto.refreshToken);
      const sessionData = await this.sessionService.validateRefreshTokenHash(refreshHash);
      if (!sessionData) {
        // احتمال سرقة - الغاء كل الجلسات
        await this.sessionService.revokeAll(payload.sub);
        throw new UnauthorizedException('الجلسة غير صالحة. يرجى تسجيل الدخول مرة اخرى');
      }

      // الحصول على المستخدم
      const user = await this.userService.findById(payload.sub);

      // الغاء الجلسة القديمة (Token Rotation)
      await this.sessionService.revoke(sessionData.sessionId);

      // انشاء tokens جديدة
      const tokens = await this.generateTokens(user, undefined);
      this.logger.log(`Token refreshed for user: ${user.id}`);

      return tokens;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Refresh token غير صالح';
      throw new UnauthorizedException(msg);
    }
  }

  /**
   * التحقق من صلاحية Access Token
   */
  async validateToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
      return { userId: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Logout
  // ============================================================================

  /**
   * تسجيل الخروج - الغاء جلسة
   */
  async logout(userId: string, dto: LogoutDto): Promise<void> {
    if (dto.deviceFingerprint) {
      // الغاء جلسة جهاز محدد
      const sessions = await this.sessionService.listActive(userId);
      const target = sessions.find(s => s.deviceFingerprint === dto.deviceFingerprint);
      if (target) await this.sessionService.revoke(target.id);
    } else {
      // الغاء جلسة الحالية فقط
      // TODO: الغاء الجلسة الحالية فقط
    }
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * تسجيل الخروج من كل الأجهزة
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAll(userId);
    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  // ============================================================================
  // MFA Handlers
  // ============================================================================

  /**
   اكمال تسجيل الدخول بعد MFA
   */
  async completeLoginWithMFA(mfaToken: string, dto: MFAVerifyDto): Promise<LoginResponseDto> {
    // التحقق من الـ MFA token المؤقت
    const userId = await this.redis.get(`mfa:temp:${mfaToken}`);
    if (!userId) throw new UnauthorizedException('رمز MFA منتهي الصلاحية');

    // TODO: الحصول على secret المستخدم من DB
    const secret = ''; // يجب استرجاعه من إعدادات المستخدم
    const result = await this.mfaService.verify(userId, dto.code, dto.method, secret);

    if (!result.verified) {
      throw new UnauthorizedException(`رمز MFA غير صالح. محاولات متبقية: ${result.remainingAttempts}`);
    }

    // حذف الـ temp token
    await this.redis.del(`mfa:temp:${mfaToken}`);

    // انشاء الجلسة الكاملة
    const user = await this.userService.findById(userId);
    const tokens = await this.generateTokens(user, undefined);
    await this.userService.updateLastLogin(user.id);

    this.logger.log(`MFA login completed for user: ${user.id}`);
    return tokens;
  }

  // ============================================================================
  // Password Recovery
  // ============================================================================

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email);
    // دائما نرجع نفس الرسالة حتى لو المستخدم غير موجود (تجنب enumeration)
    if (!user) return { message: 'تم ارسال رابط استعادة كلمة المرور اذا كان البريد مسجلاً' };

    // انشاء token استعادة
    const resetToken = randomUUID();
    await this.redis.setex(`password:reset:${resetToken}`, 3600, user.id); // ساعة واحدة

    // TODO: ارسال email باستعادة كلمة المرور
    this.logger.log(`Password reset requested for: ${user.id}`);
    return { message: 'تم ارسال رابط استعادة كلمة المرور اذا كان البريد مسجلاً' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.redis.get(`password:reset:${dto.token}`);
    if (!userId) throw new BadRequestException('رمز الاستعادة غير صالح او منتهي');

    // TODO: تحديث كلمة المرور عبر UserService
    await this.redis.del(`password:reset:${dto.token}`);

    // الغاء كل الجلسات بعد تغيير كلمة المرور
    await this.sessionService.revokeAll(userId);
    this.logger.log(`Password reset completed for user: ${userId}`);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * انشاء Access Token + Refresh Token + Session
   */
  private async generateTokens(
    user: User,
    deviceInfo?: DeviceInfoDto,
  ): Promise<LoginResponseDto> {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenJti = randomUUID();
    const refreshTokenJti = randomUUID();

    // Access Token (JWT)
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      jti: accessTokenJti,
      type: 'access',
      iat: now,
      exp: now + this.ACCESS_EXPIRY,
    }, { expiresIn: this.ACCESS_EXPIRY });

    // Refresh Token (JWT)
    const refreshToken = await this.jwtService.signAsync({
      sub: user.id,
      jti: refreshTokenJti,
      type: 'refresh',
      iat: now,
      exp: now + this.REFRESH_EXPIRY,
    }, {
      expiresIn: this.REFRESH_EXPIRY,
      secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
    });

    // انشاء الجلسة
    if (deviceInfo) {
      await this.sessionService.create({
        userId: user.id,
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        geoCountry: deviceInfo.geo?.country,
        tokenHash: this.sessionService.hashToken(accessToken),
        refreshTokenHash: this.sessionService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.REFRESH_EXPIRY * 1000).toISOString(),
      });
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.ACCESS_EXPIRY,
      user: this.mapToUserResponse(user),
      mfaRequired: false,
    };
  }

  private mapToUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? undefined,
      kycStatus: user.kycStatus,
      kycLevel: user.kycLevel,
    };
  }

  /** التحقق من حماية Brute Force */
  private async checkBruteForceProtection(email: string, ip: string): Promise<void> {
    const key = `login:attempts:${ip}:${email}`;
    const attempts = parseInt(await this.redis.get(key) ?? '0', 10);
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(`تم حظر محاولات تسجيل الدخول مؤقتاً. حاول مرة اخرى بعد ${this.LOCKOUT_DURATION / 60} دقيقة`);
    }
  }

  /** تسجيل محاولة فاشلة */
  private async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const key = `login:attempts:${ip}:${email}`;
    const attempts = parseInt(await this.redis.get(key) ?? '0', 10);
    await this.redis.setex(key, this.LOCKOUT_DURATION, String(attempts + 1));
  }

  /** مسح محاولات الفشل */
  private async clearFailedAttempts(email: string, ip: string): Promise<void> {
    await this.redis.del(`login:attempts:${ip}:${email}`);
  }

  /** انشاء MFA token مؤقت */
  private async createTemporaryMFAToken(userId: string): Promise<string> {
    const token = randomUUID();
    await this.redis.setex(`mfa:temp:${token}`, 5 * 60, userId); // 5 دقائق
    return token;
  }
}
