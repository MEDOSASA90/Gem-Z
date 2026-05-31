/**
 * =============================================================================
 * DeviceInfo - معلومات الجهاز
 * =============================================================================
 */

export interface DeviceInfo {
  /** بصمة الجهاز الفريدة */
  fingerprint: string;

  /** User Agent */
  userAgent: string;

  /** IP Address */
  ip: string;

  /** الموقع الجغرافي */
  geo: GeoLocation;

  /** نوع الجهاز */
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';

  /** نظام التشغيل */
  os?: string;

  /** إصدار نظام التشغيل */
  osVersion?: string;

  /** المتصفح */
  browser?: string;

  /** إصدار المتصفح */
  browserVersion?: string;

  /** دقة الشاشة */
  screenResolution?: string;

  /** المنطقة الزمنية */
  timezone?: string;

  /** اللغة */
  language?: string;
}

/** الموقع الجغرافي */
export interface GeoLocation {
  /** الدولة */
  country: string;

  /** المدينة */
  city: string;

  /** خط العرض */
  lat: number;

  /** خط الطول */
  lon: number;
}
