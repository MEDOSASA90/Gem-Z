/**
 * =============================================================================
 * نظام الأحداث المركزي - GEM Z Event Bus
 * =============================================================================
 * يحتوي على كل تعريفات الأحداث والـ interfaces المستخدمة في النظام
 */

/** إعدادات Fraud Metadata المرافقة لكل حدث */
export interface FraudMetadata {
  score: number;
  signals: string[];
  action: FraudAction;
}

/** إجراءات الأمان الممكنة */
export type FraudAction = 'ALLOW' | 'CHALLENGE' | 'BLOCK';

/** معلومات الجهاز المرافقة للحدث */
export interface DeviceMetadata {
  fingerprint: string;
  userAgent: string;
  ip: string;
  geo: GeoLocation;
}

/** الموقع الجغرافي */
export interface GeoLocation {
  country: string;
  city: string;
  lat: number;
  lon: number;
}

/** الـ Envelope الرئيسي لكل حدث في النظام */
export interface EventEnvelope<T = unknown> {
  event_id: string;
  event_type: EventType;
  correlation_id: string;
  actor_id: string;
  source_module: string;
  timestamp: string; // ISO 8601
  device_metadata: DeviceMetadata;
  fraud_metadata: FraudMetadata;
  payload: T;
}

/** أنواع الأحداث المدعومة في النظام */
export enum EventType {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_DEBITED = 'WALLET_DEBITED',
  WALLET_CREDITED = 'WALLET_CREDITED',
  CASHBACK_ISSUED = 'CASHBACK_ISSUED',
  CASHBACK_REDEEMED = 'CASHBACK_REDEEMED',
  GYM_CHECKED_IN = 'GYM_CHECKED_IN',
  GYM_CHECKED_OUT = 'GYM_CHECKED_OUT',
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_DISPATCHED = 'ORDER_DISPATCHED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_CHALLENGE = 'MFA_CHALLENGE',
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_ENDED = 'SESSION_ENDED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  ESCROW_CREATED = 'ESCROW_CREATED',
  ESCROW_RELEASED = 'ESCROW_RELEASED',
  POINTS_EARNED = 'POINTS_EARNED',
  POINTS_REDEEMED = 'POINTS_REDEEMED',
  MEMBERSHIP_PURCHASED = 'MEMBERSHIP_PURCHASED',
  MEMBERSHIP_EXPIRED = 'MEMBERSHIP_EXPIRED',
  GYM_CREATED = 'GYM_CREATED',
  GYM_APPROVED = 'GYM_APPROVED',
  MEMBERSHIP_CANCELLED = 'MEMBERSHIP_CANCELLED',
  MEMBERSHIP_RENEWED = 'MEMBERSHIP_RENEWED',
  WAITLIST_CONVERTED = 'WAITLIST_CONVERTED',
}

// =============================================================================
// تعريفات Payloads لكل نوع حدث
// =============================================================================

export interface UserRegisteredPayload {
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country: string;
  referral_code?: string;
}

export interface UserLoggedInPayload {
  user_id: string;
  method: 'password' | 'biometric' | 'sso';
  device_id: string;
  ip_address: string;
}

export interface WalletDebitedPayload {
  wallet_id: string;
  user_id: string;
  amount: string;
  currency: string;
  transaction_id: string;
  reason: string;
  balance_after: string;
}

export interface WalletCreditedPayload {
  wallet_id: string;
  user_id: string;
  amount: string;
  currency: string;
  transaction_id: string;
  source: string;
  balance_after: string;
}

export interface CashbackIssuedPayload {
  user_id: string;
  wallet_id: string;
  amount: string;
  currency: string;
  trigger_transaction_id: string;
  rule_id: string;
}

export interface GymCheckedInPayload {
  user_id: string;
  gym_id: string;
  branch_id: string;
  checkin_time: string;
  device_id: string;
  qr_code: string;
}

export interface GymCheckedOutPayload {
  user_id: string;
  gym_id: string;
  branch_id: string;
  checkout_time: string;
  duration_minutes: number;
}

export interface BookingCreatedPayload {
  booking_id: string;
  user_id: string;
  gym_id: string;
  slot_id: string;
  booking_date: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface BookingCancelledPayload {
  booking_id: string;
  user_id: string;
  gym_id: string;
  cancellation_reason?: string;
  refund_amount?: string;
}

export interface OrderCreatedPayload {
  order_id: string;
  user_id: string;
  total_amount: string;
  currency: string;
  items_count: number;
}

export interface OrderDispatchedPayload {
  order_id: string;
  user_id: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery: string;
}

export interface OrderDeliveredPayload {
  order_id: string;
  user_id: string;
  delivered_at: string;
}

export interface OrderCancelledPayload {
  order_id: string;
  user_id: string;
  reason: string;
  refund_status: 'PENDING' | 'PROCESSED' | 'FAILED';
}

export interface KycSubmittedPayload {
  user_id: string;
  kyc_id: string;
  document_type: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE';
  country: string;
}

export interface KycApprovedPayload {
  user_id: string;
  kyc_id: string;
  verified_by: string;
  verified_at: string;
  level: number;
}

export interface KycRejectedPayload {
  user_id: string;
  kyc_id: string;
  rejection_reason: string;
  retry_allowed: boolean;
}

export interface FraudDetectedPayload {
  user_id: string;
  event_type: EventType;
  score: number;
  signals: string[];
  action_taken: FraudAction;
  details: Record<string, unknown>;
}

export interface PaymentSucceededPayload {
  transaction_id: string;
  user_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  merchant_id?: string;
}

export interface PaymentFailedPayload {
  transaction_id: string;
  user_id: string;
  amount: string;
  currency: string;
  failure_reason: string;
  retryable: boolean;
}

export interface RefundProcessedPayload {
  refund_id: string;
  original_transaction_id: string;
  user_id: string;
  amount: string;
  currency: string;
  reason: string;
}

export interface EscrowCreatedPayload {
  escrow_id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: string;
  currency: string;
  hold_until: string;
}

export interface EscrowReleasedPayload {
  escrow_id: string;
  order_id: string;
  released_by: string;
  released_at: string;
}

export interface PointsEarnedPayload {
  user_id: string;
  points: number;
  source: string;
  balance_after: number;
}

export interface PointsRedeemedPayload {
  user_id: string;
  points: number;
  redeemed_for: string;
  balance_after: number;
}

export interface MembershipPurchasedPayload {
  membership_id: string;
  user_id: string;
  gym_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  amount: string;
  currency: string;
}

export interface MembershipExpiredPayload {
  membership_id: string;
  user_id: string;
  gym_id: string;
  expired_at: string;
}

/** Map يربط كل نوع حدث بـ Payload type الخاص به */
export interface EventPayloadMap {
  [EventType.USER_REGISTERED]: UserRegisteredPayload;
  [EventType.USER_LOGGED_IN]: UserLoggedInPayload;
  [EventType.USER_PROFILE_UPDATED]: Record<string, unknown>;
  [EventType.WALLET_CREATED]: WalletCreditedPayload;
  [EventType.WALLET_DEBITED]: WalletDebitedPayload;
  [EventType.WALLET_CREDITED]: WalletCreditedPayload;
  [EventType.CASHBACK_ISSUED]: CashbackIssuedPayload;
  [EventType.CASHBACK_REDEEMED]: CashbackIssuedPayload;
  [EventType.GYM_CHECKED_IN]: GymCheckedInPayload;
  [EventType.GYM_CHECKED_OUT]: GymCheckedOutPayload;
  [EventType.BOOKING_CREATED]: BookingCreatedPayload;
  [EventType.BOOKING_CANCELLED]: BookingCancelledPayload;
  [EventType.BOOKING_CONFIRMED]: BookingCreatedPayload;
  [EventType.ORDER_CREATED]: OrderCreatedPayload;
  [EventType.ORDER_DISPATCHED]: OrderDispatchedPayload;
  [EventType.ORDER_DELIVERED]: OrderDeliveredPayload;
  [EventType.ORDER_CANCELLED]: OrderCancelledPayload;
  [EventType.KYC_SUBMITTED]: KycSubmittedPayload;
  [EventType.KYC_APPROVED]: KycApprovedPayload;
  [EventType.KYC_REJECTED]: KycRejectedPayload;
  [EventType.FRAUD_DETECTED]: FraudDetectedPayload;
  [EventType.MFA_ENABLED]: Record<string, unknown>;
  [EventType.MFA_CHALLENGE]: Record<string, unknown>;
  [EventType.SESSION_STARTED]: Record<string, unknown>;
  [EventType.SESSION_ENDED]: Record<string, unknown>;
  [EventType.PAYMENT_SUCCEEDED]: PaymentSucceededPayload;
  [EventType.PAYMENT_FAILED]: PaymentFailedPayload;
  [EventType.REFUND_PROCESSED]: RefundProcessedPayload;
  [EventType.ESCROW_CREATED]: EscrowCreatedPayload;
  [EventType.ESCROW_RELEASED]: EscrowReleasedPayload;
  [EventType.POINTS_EARNED]: PointsEarnedPayload;
  [EventType.POINTS_REDEEMED]: PointsRedeemedPayload;
  [EventType.MEMBERSHIP_PURCHASED]: MembershipPurchasedPayload;
  [EventType.MEMBERSHIP_EXPIRED]: MembershipExpiredPayload;
}

/** Handler function type للأحداث */
export type EventHandler<T = unknown> = (envelope: EventEnvelope<T>) => Promise<void> | void;

/** خيارات الاشتراك في الأحداث */
export interface SubscribeOptions {
  /** pattern للاشتراك (يمكن استخدام wildcards) */
  pattern: string;
  /** اسم الـ queue للـ load balancing */
  queue?: string;
  /** عدد المحاولات عند الفشل */
  maxRetries?: number;
  /** تأخير بين المحاولات (ms) */
  retryDelay?: number;
  /** timeout للمعالج (ms) */
  timeout?: number;
}

/** نتيجة عملية النشر */
export interface PublishResult {
  success: boolean;
  eventId: string;
  publishedAt: string;
  subscribersCount: number;
}

/** إحصائيات الـ Event Bus */
export interface EventBusStats {
  totalPublished: number;
  totalSubscribed: number;
  activeSubscriptions: number;
  failedDeliveries: number;
  avgProcessingTimeMs: number;
}

export interface GymCreatedEvent {
  gym_id: string;
  owner_id: string;
  name: string;
  slug: string;
}

export interface GymApprovedEvent {
  gym_id: string;
  approved_by: string;
  status: string;
}

export interface MembershipPurchasedEvent {
  membership_id: string;
  user_id: string;
  gym_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
}

export interface MembershipCancelledEvent {
  membership_id: string;
  user_id: string;
  gym_id: string;
  reason: string;
}

export interface MembershipRenewedEvent {
  membership_id: string;
  user_id: string;
  gym_id: string;
  new_end_date: string;
}

export interface MembershipExpiredEvent {
  membership_id: string;
  user_id: string;
  gym_id: string;
  expired_at: string;
}

export interface GymCheckedInEvent {
  attendance_id: string;
  user_id: string;
  gym_id: string;
  branch_id: string;
  entry_time: string;
  method: string;
}

export interface BookingCreatedEvent {
  booking_id: string;
  user_id: string;
  slot_id: string;
  gym_id: string;
  booked_at: string;
}

export interface BookingCancelledEvent {
  booking_id: string;
  user_id: string;
  slot_id: string;
  reason: string;
  penalty_amount: number;
}

export interface BookingCheckedInEvent {
  booking_id: string;
  user_id: string;
  slot_id: string;
  check_in_time: string;
  method: string;
}

export interface WaitlistConvertedEvent {
  waitlist_id: string;
  booking_id: string;
  user_id: string;
  slot_id: string;
}
