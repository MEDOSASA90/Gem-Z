/**
 * =============================================================================
 * Security Types - تعريفات نظام الأمان
 * =============================================================================
 */

/** معلومات الجهاز */
export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  ip: string;
  geo: GeoLocation;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

/** الموقع الجغرافي */
export interface GeoLocation {
  country: string;
  city: string;
  lat: number;
  lon: number;
}

/** درجة الخطر */
export interface FraudScore {
  /** الدرجة من 0 إلى 100 */
  score: number;
  /** الإشارات المكتشفة */
  signals: FraudSignal[];
  /** الإجراء المقترح */
  action: FraudAction;
  /** تفاصيل إضافية */
  details: Record<string, unknown>;
  /** وقت التقييم */
  evaluatedAt: string;
}

/** إجراء مكافحة الاحتيال */
export type FraudAction = 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'REVIEW';

/** إشارة احتيال */
export interface FraudSignal {
  /** نوع الإشارة */
  type: FraudSignalType;
  /** وصف الإشارة */
  description: string;
  /** وزن الإشارة (تأثيرها على الدرجة) */
  weight: number;
  /** الثقة في الإشارة (0-1) */
  confidence: number;
  /** وقت الاكتشاف */
  detectedAt: string;
}

/** أنواع إشارات الاحتيال */
export type FraudSignalType =
  | 'NEW_DEVICE'
  | 'SUSPICIOUS_IP'
  | 'RAPID_TRANSACTIONS'
  | 'UNUSUAL_LOCATION'
  | 'VELOCITY_CHECK'
  | 'BOT_BEHAVIOR'
  | 'ACCOUNT_TAKEOVER'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'LARGE_AMOUNT'
  | 'OFF_HOURS_ACTIVITY'
  | 'PROXY_VPN'
  | 'SANCTIONED_COUNTRY';

/** إعدادات Rate Limiting */
export interface RateLimitConfig {
  /** المفتاح (key) للتعريف */
  key: string;
  /** الحد الأقصى للطلبات */
  limit: number;
  /** النافذة الزمنية (ثواني) */
  windowSeconds: number;
  /** هل يتم حظر الـ IP؟ */
  blockOnExceeded?: boolean;
  /** مدة الحظر (ثواني) */
  blockDurationSeconds?: number;
}

/** نتيجة فحص Rate Limit */
export interface RateLimitResult {
  /** هل مسموح؟ */
  allowed: boolean;
  /** عدد الطلبات الحالي */
  current: number;
  /** الحد الأقصى */
  limit: number;
  /** الوقت المتبقي لإعادة الضبط */
  resetAfterSeconds: number;
  /** هل تم الحظر؟ */
  blocked: boolean;
  /** وقت فك الحظر */
  blockedUntil?: string;
}

/** حدث أمان للتحليل */
export interface SecurityEvent {
  type: string;
  userId: string;
  deviceInfo: DeviceInfo;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** حالة الجهاز المسجل */
export interface DeviceTrustRecord {
  deviceId: string;
  userId: string;
  fingerprint: string;
  deviceInfo: DeviceInfo;
  trustLevel: 'TRUSTED' | 'UNTRUSTED' | 'PENDING';
  firstSeen: string;
  lastSeen: string;
  loginCount: number;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
}

/** incident احتيالي */
export interface FraudIncident {
  id: string;
  userId: string;
  type: FraudSignalType;
  score: number;
  signals: FraudSignal[];
  actionTaken: FraudAction;
  deviceInfo: DeviceInfo;
  details: Record<string, unknown>;
  reportedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
}
