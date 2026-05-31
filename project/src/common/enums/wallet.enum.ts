/**
 * حالات المحفظة
 * Wallet status values
 */
export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  SUSPENDED = 'SUSPENDED',
}

/**
 * أنواع المحافظ
 * Wallet type classification
 */
export enum WalletType {
  CONSUMER = 'CONSUMER',
  MERCHANT = 'MERCHANT',
  ESCROW = 'ESCROW',
  TREASURY = 'TREASURY',
}

/**
 * أنواع المعاملات
 * Transaction types for wallet operations
 */
export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  TRANSFER = 'TRANSFER',
  EXCHANGE = 'EXCHANGE',
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  CASHBACK = 'CASHBACK',
  REFUND = 'REFUND',
}

/**
 * حالات المعاملة
 * Transaction status values
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

/**
 * أنواع قيود الدفتر (المدين/الدائن)
 * Ledger entry types for double-entry bookkeeping
 */
export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}
