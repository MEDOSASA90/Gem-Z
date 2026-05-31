/**
 * =============================================================================
 * DeviceService - خدمة بصمة الجهاز والتحقق منه
 * =============================================================================
 * تقوم بإنشاء بصمة فريدة للجهاز والتحقق مما إذا كان موثوقاً
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  DeviceInfo,
  DeviceTrustRecord,
} from './security.types';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly trustedDevices = new Map<string, DeviceTrustRecord>();
  private readonly maxTrustedDevicesPerUser: number;

  constructor(private readonly configService: ConfigService) {
    this.maxTrustedDevicesPerUser = this.configService.get<number>('MAX_TRUSTED_DEVICES', 5);
  }

  /**
   * إنشاء بصمة فريدة للجهاز
   * @param deviceInfo - معلومات الجهاز
   * @returns البصمة الفريدة (hash)
   */
  fingerprint(deviceInfo: DeviceInfo): string {
    // إنشاء hash من معلومات الجهاز المستقرة (تجاهل IP لأنه يتغير)
    const components = [
      deviceInfo.userAgent,
      deviceInfo.deviceType,
      deviceInfo.os,
      deviceInfo.osVersion,
      deviceInfo.browser,
      deviceInfo.browserVersion,
      deviceInfo.screenResolution,
      deviceInfo.timezone,
      deviceInfo.language,
    ].filter(Boolean);

    const raw = components.join('|');
    const hash = createHash('sha256').update(raw).digest('hex').substring(0, 32);

    this.logger.debug('Device fingerprint generated: %s', hash);
    return hash;
  }

  /**
   * التحقق مما إذا كان الجهاز موثوقاً للمستخدم
   * @param deviceId - بصمة الجهاز
   * @param userId - معرف المستخدم
   */
  async validate(deviceId: string, userId: string): Promise<boolean> {
    const record = this.trustedDevices.get(this.deviceKey(deviceId, userId));

    if (!record) {
      this.logger.debug('Device %s not found for user %s', deviceId, userId);
      return false;
    }

    if (record.isBlocked) {
      this.logger.warn('Device %s is blocked for user %s', deviceId, userId);
      return false;
    }

    if (record.trustLevel === 'TRUSTED') {
      // تحديث last seen
      record.lastSeen = new Date().toISOString();
      record.loginCount++;
      return true;
    }

    return record.trustLevel === 'PENDING';
  }

  /**
   * التحقق مما إذا كان هذا جهاز جديد للمستخدم
   * @param deviceId - بصمة الجهاز
   * @param userId - معرف المستخدم
   */
  async isNewDevice(deviceId: string, userId: string): Promise<boolean> {
    const record = this.trustedDevices.get(this.deviceKey(deviceId, userId));
    return !record || record.loginCount === 0;
  }

  /**
   * تسجيل جهاز جديد
   */
  async registerDevice(deviceInfo: DeviceInfo, userId: string): Promise<DeviceTrustRecord> {
    const fingerprint = this.fingerprint(deviceInfo);
    const key = this.deviceKey(fingerprint, userId);
    const now = new Date().toISOString();

    const existing = this.trustedDevices.get(key);
    if (existing) {
      existing.lastSeen = now;
      existing.loginCount++;
      this.logger.debug('Device %s updated for user %s (login #%d)', 
        fingerprint, userId, existing.loginCount);
      return existing;
    }

    // التحقق من عدد الأجهزة المسموح
    const userDevices = this.getUserDevices(userId);
    if (userDevices.length >= this.maxTrustedDevicesPerUser) {
      this.logger.warn('User %s has reached max trusted devices (%d)',
        userId, this.maxTrustedDevicesPerUser);
    }

    const record: DeviceTrustRecord = {
      deviceId: fingerprint,
      userId,
      fingerprint,
      deviceInfo,
      trustLevel: 'PENDING',
      firstSeen: now,
      lastSeen: now,
      loginCount: 1,
      isBlocked: false,
    };

    this.trustedDevices.set(key, record);
    this.logger.log('New device registered for user %s: %s', userId, fingerprint);

    return record;
  }

  /**
   * نموذج التحقق القائم على الخطورة - Risk-Based Trust Model
   */
  async evaluateDeviceRisk(deviceInfo: DeviceInfo, userId: string): Promise<{
    trustGrade: 'A' | 'B' | 'C' | 'F';
    requiresMFA: boolean;
    action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
  }> {
    const fingerprint = this.fingerprint(deviceInfo);
    const userDevices = this.getUserDevices(userId);
    const isExisting = userDevices.some(d => d.deviceId === fingerprint);

    if (isExisting) {
      return { trustGrade: 'A', requiresMFA: false, action: 'ALLOW' };
    }

    let riskScore = 0;
    const lastSessionLocation = userDevices[0]?.deviceInfo.geo.country;
    
    if (lastSessionLocation && lastSessionLocation !== deviceInfo.geo.country) {
      riskScore += 45; // Unusual geo change
    }

    if (deviceInfo.deviceType === 'unknown') {
      riskScore += 30; // Suspicious browser/device signature
    }

    if (riskScore >= 75) {
      return { trustGrade: 'F', requiresMFA: true, action: 'BLOCK' };
    } else if (riskScore >= 40) {
      return { trustGrade: 'C', requiresMFA: true, action: 'CHALLENGE' };
    }

    return { trustGrade: 'B', requiresMFA: true, action: 'ALLOW' };
  }

  /**
   * الموافقة على جهاز (تحويله لـ trusted)
   */
  async approveDevice(deviceId: string, userId: string): Promise<void> {
    const record = this.trustedDevices.get(this.deviceKey(deviceId, userId));
    if (record) {
      record.trustLevel = 'TRUSTED';
      this.logger.log('Device %s approved for user %s', deviceId, userId);
    }
  }

  /**
   * حظر جهاز
   */
  async blockDevice(deviceId: string, userId: string, reason: string): Promise<void> {
    const record = this.trustedDevices.get(this.deviceKey(deviceId, userId));
    if (record) {
      record.isBlocked = true;
      record.blockReason = reason;
      record.blockedAt = new Date().toISOString();
      this.logger.warn('Device %s blocked for user %s: %s', deviceId, userId, reason);
    }
  }

  /**
   * فك حظر جهاز
   */
  async unblockDevice(deviceId: string, userId: string): Promise<void> {
    const record = this.trustedDevices.get(this.deviceKey(deviceId, userId));
    if (record) {
      record.isBlocked = false;
      record.blockReason = undefined;
      record.blockedAt = undefined;
      this.logger.log('Device %s unblocked for user %s', deviceId, userId);
    }
  }

  /**
   * الحصول على أجهزة المستخدم
   */
  getUserDevices(userId: string): DeviceTrustRecord[] {
    const devices: DeviceTrustRecord[] = [];
    for (const [, record] of this.trustedDevices) {
      if (record.userId === userId) {
        devices.push(record);
      }
    }
    return devices.sort((a, b) => 
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }

  /**
   * حذف أجهزة المستخدم
   */
  async removeUserDevices(userId: string): Promise<number> {
    let removed = 0;
    for (const [key, record] of this.trustedDevices) {
      if (record.userId === userId) {
        this.trustedDevices.delete(key);
        removed++;
      }
    }
    this.logger.log('Removed %d devices for user %s', removed, userId);
    return removed;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private deviceKey(deviceId: string, userId: string): string {
    return `${userId}:${deviceId}`;
  }
}
