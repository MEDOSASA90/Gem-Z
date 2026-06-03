/**
 * ============================================================================
 * GEM Z - Identity Module
 * SessionService - خدمة ادارة الجلسات
 * ============================================================================
 * تدير جلسات تسجيل الدخول: انشاء، تحقق، الغاء، وتخزين في Redis
 * ============================================================================
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { Session } from './session.entity';
import { CreateSessionDto } from './session.dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  /** TTL للجلسة في Redis (بالثواني) - 15 دقيقة */
  private readonly SESSION_TTL = 15 * 60;
  /** TTL للـ refresh token في Redis - 7 ايام */
  private readonly REFRESH_TTL = 7 * 24 * 60 * 60;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  /**
   * انشاء جلسة جديدة
   * - تخزن في PostgreSQL للاستمرارية
   * - تخزن في Redis للوصول السريع
   */
  async create(dto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create({
      userId: dto.userId,
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent ?? null,
      geoCountry: dto.geoCountry ?? null,
      tokenHash: dto.tokenHash,
      refreshTokenHash: dto.refreshTokenHash,
      expiresAt: new Date(dto.expiresAt),
      isActive: true,
      mfaVerified: false,
      lastActiveAt: new Date(),
    });

    const saved = await this.sessionRepository.save(session);

    // تخزين في Redis للوصول السريع
    const redisKey = `session:${dto.tokenHash}`;
    await this.redis.setex(
      redisKey,
      this.SESSION_TTL,
      JSON.stringify({ userId: dto.userId, sessionId: saved.id, active: true }),
    );

    // تخزين refresh token في Redis
    const refreshKey = `refresh:${dto.refreshTokenHash}`;
    await this.redis.setex(
      refreshKey,
      this.REFRESH_TTL,
      JSON.stringify({ userId: dto.userId, sessionId: saved.id }),
    );

    this.logger.log(`Session created: ${saved.id} for user ${dto.userId}`);
    return saved;
  }

  /** التحقق من صلاحية الجلسة */
  async validate(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
    });
    if (!session) return false;
    if (new Date() > session.expiresAt) {
      await this.revoke(sessionId);
      return false;
    }
    return true;
  }

  /** التحقق من صلاحية الـ token عبر Redis (سريع) */
  async validateTokenHash(tokenHash: string): Promise<{ userId: string; sessionId: string } | null> {
    const redisKey = `session:${tokenHash}`;
    const data = await this.redis.get(redisKey);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (!parsed.active) return null;
    return { userId: parsed.userId, sessionId: parsed.sessionId };
  }

  /** التحقق من صلاحية refresh token عبر Redis */
  async validateRefreshTokenHash(refreshHash: string): Promise<{ userId: string; sessionId: string } | null> {
    const redisKey = `refresh:${refreshHash}`;
    const data = await this.redis.get(redisKey);
    if (!data) return null;
    return JSON.parse(data);
  }

  /** الغاء جلسة (تسجيل خروج) */
  async revoke(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('الجلسة غير موجودة');

    session.isActive = false;
    await this.sessionRepository.save(session);

    // حذف من Redis
    await this.redis.del(`session:${session.tokenHash}`);
    await this.redis.del(`refresh:${session.refreshTokenHash}`);

    this.logger.log(`Session revoked: ${sessionId}`);
  }

  /** الغاء جلسة بواسطة token hash */
  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { tokenHash } });
    if (session) await this.revoke(session.id);
  }

  /** الغاء كل جلسات المستخدم */
  async revokeAll(userId: string): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      session.isActive = false;
      await this.redis.del(`session:${session.tokenHash}`);
      await this.redis.del(`refresh:${session.refreshTokenHash}`);
    }

    if (sessions.length > 0) {
      await this.sessionRepository.save(sessions);
      this.logger.log(`All sessions revoked for user: ${userId} (${sessions.length} sessions)`);
    }
  }

  /** سرد الجلسات النشطة للمستخدم */
  async listActive(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActiveAt: 'DESC' },
    });
  }

  /** تحديث وقت النشاط الاخير */
  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { lastActiveAt: new Date() });
  }

  /** تحديث وقت النشاط بواسطة token hash */
  async updateActivityByToken(tokenHash: string): Promise<void> {
    await this.sessionRepository.update(
      { tokenHash },
      { lastActiveAt: new Date() },
    );
  }

  /** التحقق من MFA للجلسة */
  async checkMFA(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['mfaVerified', 'isActive'],
    });
    return session?.mfaVerified === true && session?.isActive === true;
  }

  /** تعيين MFA كمتحقق */
  async setMFAVerified(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { mfaVerified: true });
  }

  /** تمديد TTL للجلسة في Redis */
  async extendSessionTTL(tokenHash: string, ttlSeconds: number = this.SESSION_TTL): Promise<void> {
    const redisKey = `session:${tokenHash}`;
    await this.redis.expire(redisKey, ttlSeconds);
  }

  /** العثور على جلسة بواسطة ID */
  async findById(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findOne({ where: { id: sessionId } });
  }

  /** العثور على جلسة بواسطة Token Hash */
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.sessionRepository.findOne({ where: { tokenHash } });
  }

  /** Hash token لاستخدامه للتخزين */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
