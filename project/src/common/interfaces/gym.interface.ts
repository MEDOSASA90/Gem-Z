/**
 * إعدادات الجيم (JSONB)
 */
export interface GymSettings {
  /** لون الثيم الرئيسي */
  primaryColor?: string;
  /** اللغة الافتراضية */
  defaultLanguage?: string;
  /** المنطقة الزمنية */
  timezone?: string;
  /** السياسات */
  policies?: {
    cancellationHours?: number;
    freezeDays?: number;
    guestAllowed?: boolean;
  };
  /** إعدادات الإشعارات */
  notifications?: {
    bookingReminder?: boolean;
    classCancelled?: boolean;
    membershipExpiry?: boolean;
  };
  [key: string]: unknown;
}

/**
 * تحليلات الجيم (JSONB)
 */
export interface GymAnalytics {
  totalMembers?: number;
  monthlyRevenue?: number;
  averageAttendance?: number;
  peakHours?: string[];
  [key: string]: unknown;
}

/**
 * ساعات العمل للفرع
 */
export interface OperatingHours {
  [day: string]: {
    open: string;   // HH:mm format
    close: string;  // HH:mm format
    isOpen: boolean;
  };
}

/**
 * إعدادات الفرع
 */
export interface BranchSettings {
  maxCapacity?: number;
  requiresBooking?: boolean;
  allowedActivities?: string[];
  [key: string]: unknown;
}

/**
 * بيانات الموقع الجغرافي
 */
export interface GeoLocation {
  lat: number;
  lon: number;
}
