/**
 * =============================================================================
 * FraudService - خدمة كشف الاحتيال
 * =============================================================================
 * Mock implementation returns scores based on heuristics
 * Thresholds: >75=BLOCK, >50=CHALLENGE, <=50=ALLOW
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  FraudScore,
  FraudAction,
  FraudSignal,
  FraudSignalType,
  SecurityEvent,
  FraudIncident,
  DeviceInfo,
} from './security.types';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);
  private readonly incidents: FraudIncident[] = [];

  // Thresholds
  private readonly BLOCK_THRESHOLD = 75;
  private readonly CHALLENGE_THRESHOLD = 50;

  /** 
   * حساب درجة الخطر للحدث
   * @returns FraudScore من 0 إلى 100
   */
  score(event: SecurityEvent): FraudScore {
    const signals = this.detectSignals(event);
    let totalScore = 0;

    for (const signal of signals) {
      totalScore += signal.weight * signal.confidence;
    }

    // Normalization إلى 0-100
    const score = Math.min(Math.round(totalScore), 100);
    const action = this.checkThreshold(score);

    const result: FraudScore = {
      score,
      signals,
      action,
      details: {
        eventType: event.type,
        userId: event.userId,
        deviceType: event.deviceInfo.deviceType,
        country: event.deviceInfo.geo.country,
        signalCount: signals.length,
        rawScore: totalScore,
      },
      evaluatedAt: new Date().toISOString(),
    };

    this.logger.debug(
      'Fraud score for user %s: %d (action: %s)',
      event.userId,
      score,
      action,
    );

    // Auto-report إذا كانت الدرجة عالية
    if (score > this.CHALLENGE_THRESHOLD) {
      this.reportIncident({
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: event.userId,
        type: signals[0]?.type || 'RAPID_TRANSACTIONS',
        score,
        signals,
        actionTaken: action,
        deviceInfo: event.deviceInfo,
        details: event.metadata,
        reportedAt: new Date().toISOString(),
        status: 'OPEN',
      });
    }

    return result;
  }

  /**
   * تحويل الدرجة إلى إجراء
   * Thresholds: >75=BLOCK, >50=CHALLENGE, <=50=ALLOW
   */
  checkThreshold(score: number): FraudAction {
    if (score > this.BLOCK_THRESHOLD) {
      return 'BLOCK';
    }
    if (score > this.CHALLENGE_THRESHOLD) {
      return 'CHALLENGE';
    }
    return 'ALLOW';
  }

  /**
   * اكتشاف أنماط الاحتيال للمستخدم
   */
  detectPatterns(userId: string): FraudSignal[] {
    const userIncidents = this.incidents.filter((i) => i.userId === userId);
    const signals: FraudSignal[] = [];

    if (userIncidents.length >= 3) {
      signals.push({
        type: 'RAPID_TRANSACTIONS',
        description: `User has ${userIncidents.length} fraud incidents`,
        weight: 20,
        confidence: 0.8,
        detectedAt: new Date().toISOString(),
      });
    }

    const openIncidents = userIncidents.filter((i) => i.status === 'OPEN');
    if (openIncidents.length >= 2) {
      signals.push({
        type: 'ACCOUNT_TAKEOVER',
        description: `User has ${openIncidents.length} open incidents`,
        weight: 35,
        confidence: 0.7,
        detectedAt: new Date().toISOString(),
      });
    }

    return signals;
  }

  /**
   * تسجيل حادثة احتيال
   */
  reportIncident(incident: FraudIncident): void {
    this.incidents.push(incident);
    this.logger.warn(
      'Fraud incident reported: user=%s, type=%s, score=%d, action=%s',
      incident.userId,
      incident.type,
      incident.score,
      incident.actionTaken,
    );
  }

  /**
   * الحصول على حوادث مستخدم
   */
  getUserIncidents(userId: string): FraudIncident[] {
    return this.incidents
      .filter((i) => i.userId === userId)
      .sort((a, b) => 
        new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
      );
  }

  /**
   * الحصول على جميع الحوادث المفتوحة
   */
  getOpenIncidents(): FraudIncident[] {
    return this.incidents.filter((i) => i.status === 'OPEN');
  }

  /**
   * حل حادثة
   */
  resolveIncident(
    incidentId: string,
    resolverId: string,
    status: 'RESOLVED' | 'FALSE_POSITIVE',
  ): boolean {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return false;

    incident.status = status;
    incident.resolvedAt = new Date().toISOString();
    incident.resolvedBy = resolverId;

    this.logger.log('Incident %s resolved as %s by %s', incidentId, status, resolverId);
    return true;
  }

  // ============================================================================
  // Private Methods - Heuristics
  // ============================================================================

  /** اكتشاف الإشارات من الحدث */
  private detectSignals(event: SecurityEvent): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // فحص البلد المشبوه
    const riskyCountries = ['XX', 'YY', 'ZZ']; // placeholder
    if (riskyCountries.includes(event.deviceInfo.geo.country)) {
      signals.push({
        type: 'SANCTIONED_COUNTRY',
        description: `Connection from risky country: ${event.deviceInfo.geo.country}`,
        weight: 40,
        confidence: 0.9,
        detectedAt: new Date().toISOString(),
      });
    }

    // فحص نوع الجهاز
    if (event.deviceInfo.deviceType === 'unknown') {
      signals.push({
        type: 'BOT_BEHAVIOR',
        description: 'Unknown device type detected',
        weight: 15,
        confidence: 0.6,
        detectedAt: new Date().toISOString(),
      });
    }

    // فحص velocity (للتبسيط: نفترض كل طلب سريع = إشارة)
    if (event.type === 'rapid_login' || event.type === 'rapid_transaction') {
      signals.push({
        type: 'VELOCITY_CHECK',
        description: 'Rapid activity detected',
        weight: 25,
        confidence: 0.8,
        detectedAt: new Date().toISOString(),
      });
    }

    // فحص المبالغ الكبيرة
    const amount = event.metadata?.amount as number;
    if (typeof amount === 'number' && amount > 10000) {
      signals.push({
        type: 'LARGE_AMOUNT',
        description: `Large transaction amount: ${amount}`,
        weight: 20,
        confidence: 0.7,
        detectedAt: new Date().toISOString(),
      });
    }

    // فحص الساعات الغريبة (منتصف الليل إلى 5 صباحاً)
    const hour = new Date(event.timestamp).getHours();
    if (hour >= 0 && hour <= 5) {
      signals.push({
        type: 'OFF_HOURS_ACTIVITY',
        description: `Activity during off-hours: ${hour}:00`,
        weight: 10,
        confidence: 0.4,
        detectedAt: new Date().toISOString(),
      });
    }

    // فحص proxy/VPN
    if (event.metadata?.isProxy || event.metadata?.isVpn) {
      signals.push({
        type: 'PROXY_VPN',
        description: 'Connection via proxy or VPN detected',
        weight: 20,
        confidence: 0.75,
        detectedAt: new Date().toISOString(),
      });
    }

    return signals;
  }
}
