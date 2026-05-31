/**
 * حالات الجيم المختلفة في دورة حياته
 * Gym lifecycle states
 */
export enum GymStatus {
  PENDING = 'PENDING',   // بانتظار الموافقة الإدارية
  ACTIVE = 'ACTIVE',     // نشط ويعمل
  SUSPENDED = 'SUSPENDED', // موقف مؤقتاً
  CLOSED = 'CLOSED',     // مغلق نهائياً
}

/**
 * حالات KYC (اعرف عميلك) للجيم
 */
export enum KYCStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/**
 * حالات الفرع
 */
export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RENOVATING = 'RENOVATING',
  CLOSED = 'CLOSED',
}

/**
 * حالات العضوية
 */
export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  FROZEN = 'FROZEN',
}

/**
 * حالات السلوت (الحصة التدريبية)
 */
export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  FULL = 'FULL',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * حالات الحجز
 */
export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  ATTENDED = 'ATTENDED',
}

/**
 * طرق تسجيل الدخول (Check-in)
 */
export enum CheckInMethod {
  QR = 'QR',
  MANUAL = 'MANUAL',
  BIOMETRIC = 'BIOMETRIC',
}

/**
 * حالات قائمة الانتظار
 */
export enum WaitlistStatus {
  WAITING = 'WAITING',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
}

/**
 * حالات موظف المؤسسة
 */
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

/**
 * فئات الإذن (Permission Categories)
 */
export enum PermissionCategory {
  FINANCE = 'FINANCE',
  KYC = 'KYC',
  OPERATIONS = 'OPERATIONS',
  SECURITY = 'SECURITY',
  CONTENT = 'CONTENT',
}
