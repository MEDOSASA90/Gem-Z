/**
 * حالات الضمان
 * Escrow status lifecycle
 */
export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

/**
 * شروط تحرير الضمان
 */
export enum ReleaseConditionType {
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  TIME_EXPIRED = 'TIME_EXPIRED',
  BUYER_APPROVED = 'BUYER_APPROVED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
}
