/**
 * =============================================================================
 * GeoLocation - واجهة الموقع الجغرافي
 * =============================================================================
 */

export interface GeoLocation {
  /** كود الدولة ISO (مثال: EG, SA, US) */
  country: string;

  /** اسم الدولة */
  countryName?: string;

  /** المدينة */
  city: string;

  /** المنطقة/المحافظة */
  region?: string;

  /** خط العرض */
  lat: number;

  /** خط الطول */
  lon: number;

  /** المنطقة الزمنية */
  timezone?: string;

  /** هل الاتصال عبر VPN/Proxy؟ */
  isVpn?: boolean;

  /** هل الاتصال عبر Proxy؟ */
  isProxy?: boolean;

  /** ISP */
  isp?: string;
}

/** نتيجة reverse geocoding */
export interface GeocodeResult {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  formattedAddress?: string;
}
