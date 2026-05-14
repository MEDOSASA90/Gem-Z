/**
 * GEM Z — Wallet System Type Definitions
 * Central type definitions for the entire financial subsystem.
 */

// ─── Database Enums ──────────────────────────────────────────

export type WalletOwnerType = 'user' | 'gym' | 'store' | 'platform';
export type Currency = 'EGP' | 'USD';
export type LedgerEntryType = 'debit' | 'credit';
export type TxnStatus = 'pending' | 'completed' | 'failed' | 'reversed';
export type BalanceField = 'available' | 'pending' | 'frozen';
export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'rejected';

export type TxnType =
    | 'wallet_topup'
    | 'wallet_withdrawal'
    | 'subscription_payment'
    | 'order_payment'
    | 'trainer_session_payment'
    | 'platform_fee'
    | 'gym_settlement'
    | 'store_settlement'
    | 'trainer_settlement'
    | 'referral_bonus'
    | 'coins_redemption'
    | 'flash_sale_discount'
    | 'refund'
    | 'adjustment'
    | 'p2p_transfer'
    | 'challenge_entry_fee'
    | 'challenge_prize_payout'
    | 'freeze'
    | 'unfreeze'
    | 'platform_credit';

// ─── Database Row Types ──────────────────────────────────────

export interface Wallet {
    id: string;
    owner_type: WalletOwnerType;
    owner_id: string;
    currency: Currency;
    available_bal: number;
    pending_bal: number;
    frozen_bal: number;
    lifetime_earned: number;
    lifetime_spent: number;
    daily_topup_limit: number;
    daily_withdraw_limit: number;
    is_frozen: boolean;
    frozen_reason: string | null;
    frozen_at: Date | null;
    frozen_by: string | null;
    version: number;
    created_at: Date;
    updated_at: Date;
}

export interface Transaction {
    id: string;
    reference_no: string;
    idempotency_key: string | null;
    txn_type: TxnType;
    status: TxnStatus;
    total_amount: number;
    currency: Currency;
    description: string | null;
    initiator_user_id: string | null;
    payment_gateway: string | null;
    gateway_ref: string | null;
    gateway_response: Record<string, any> | null;
    parent_txn_id: string | null;
    metadata: Record<string, any>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
    completed_at: Date | null;
    failed_at: Date | null;
    failure_reason: string | null;
}

export interface LedgerEntry {
    id: number;
    txn_id: string;
    wallet_id: string;
    entry_type: LedgerEntryType;
    amount: number;
    running_balance: number;
    balance_field: BalanceField;
    note: string | null;
    created_at: Date;
}

export interface WithdrawalRequest {
    id: string;
    wallet_id: string;
    txn_id: string | null;
    amount: number;
    fee: number;
    net_amount: number;
    method: string;
    account_number: string | null;
    account_name: string | null;
    bank_name: string | null;
    status: WithdrawalStatus;
    admin_note: string | null;
    rejection_reason: string | null;
    risk_score: number | null;
    flagged: boolean;
    requested_by: string;
    processed_by: string | null;
    processed_at: Date | null;
    created_at: Date;
}

export interface IdempotencyRecord {
    key: string;
    txn_id: string;
    user_id: string;
    response_code: number;
    response_body: Record<string, any>;
    created_at: Date;
    expires_at: Date;
}

export interface WalletAuditLog {
    id: number;
    wallet_id: string;
    action: string;
    actor_user_id: string | null;
    actor_type: 'user' | 'admin' | 'system' | 'webhook';
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
}

// ─── Service DTOs ────────────────────────────────────────────

export interface LedgerInstruction {
    walletId: string;
    entryType: LedgerEntryType;
    amount: number;         // Always positive
    balanceField: BalanceField;
    note?: string;
}

export interface PaymentRequest {
    payerUserId: string;
    receiverOwnerId: string;
    receiverOwnerType: WalletOwnerType;
    amount: number;
    txnType: TxnType;
    platformFeePct: number;
    description: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface TopUpRequest {
    userId: string;
    amount: number;
    gateway: string;            // 'fawry' | 'paymob' | 'instapay'
    gatewayRef: string;
    gatewayResponse?: Record<string, any>;
    idempotencyKey?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface WithdrawRequest {
    userId: string;
    walletId: string;
    amount: number;
    method: string;             // 'instapay' | 'vodafone_cash' | 'bank_transfer'
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
}

export interface RefundRequest {
    originalTxnId: string;
    amount: number;
    reason: string;
    initiatedBy: string;
    isPartial: boolean;
}

export interface P2PTransferRequest {
    senderUserId: string;
    recipientUserId: string;
    amount: number;
    description?: string;
    idempotencyKey?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface WalletHistoryFilters {
    walletId: string;
    entryType?: LedgerEntryType;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export interface WalletSummary {
    wallet: Wallet;
    todayTopups: number;
    todayWithdrawals: number;
    recentTransactions: Transaction[];
}

export interface ReconciliationReport {
    date: string;
    totalWallets: number;
    reconciled: number;
    discrepancies: {
        walletId: string;
        ownerType: WalletOwnerType;
        ownerId: string;
        storedBalance: number;
        computedBalance: number;
        discrepancy: number;
    }[];
}

// ─── Utility ─────────────────────────────────────────────────

export function generateRefNo(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Safe numeric conversion from PostgreSQL NUMERIC to JS number.
 * Always returns a 4-decimal-place number.
 */
export function toMoney(value: any): number {
    return Number(Number(value).toFixed(4));
}
