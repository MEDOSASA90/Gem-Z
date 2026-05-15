/**
 * GEM Z — BullMQ Queue Type Definitions
 *
 * Centralized types for all background job types, data interfaces,
 * and queue configuration. Ensures type safety across producers,
 * processors, and the dashboard.
 */

// ─── Job Type Enum ───────────────────────────────────────────

export enum JobType {
    SEND_EMAIL = 'send_email',
    AI_PROCESSING = 'ai_processing',
    PUSH_NOTIFICATION = 'push_notification',
    DAILY_REPORT = 'daily_report',
    WALLET_RECONCILIATION = 'wallet_reconciliation',
    CLEANUP_OLD_DATA = 'cleanup_old_data',
    PROCESS_WITHDRAWAL = 'process_withdrawal',
}

// ─── Queue Name Constants ────────────────────────────────────

export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    AI: 'ai-processing-queue',
    NOTIFICATION: 'notification-queue',
    REPORT: 'daily-report-queue',
    WALLET: 'wallet-reconciliation-queue',
    CLEANUP: 'cleanup-queue',
    WITHDRAWAL: 'withdrawal-queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Dead Letter Queue ───────────────────────────────────────

export const DLQ_NAME = 'dead-letter-queue';

// ─── Job Data Interfaces ─────────────────────────────────────

export interface EmailJobData {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, any>;
}

export interface AIJobData {
    userId: string;
    type: 'diet_plan' | 'form_analysis' | 'comprehensive_plan';
    inputData: any;
}

export interface NotificationJobData {
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
}

export interface DailyReportJobData {
    reportDate?: string; // ISO date string, defaults to today
}

export interface WalletReconciliationJobData {
    walletId?: string;
    checkDate?: string;
}

export interface CleanupJobData {
    olderThanDays?: number;
    dryRun?: boolean;
}

export interface WithdrawalJobData {
    withdrawalId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    paymentDetails: Record<string, any>;
}

// ─── Discriminated Union for All Job Data Types ──────────────

export type JobDataMap = {
    [JobType.SEND_EMAIL]: EmailJobData;
    [JobType.AI_PROCESSING]: AIJobData;
    [JobType.PUSH_NOTIFICATION]: NotificationJobData;
    [JobType.DAILY_REPORT]: DailyReportJobData;
    [JobType.WALLET_RECONCILIATION]: WalletReconciliationJobData;
    [JobType.CLEANUP_OLD_DATA]: CleanupJobData;
    [JobType.PROCESS_WITHDRAWAL]: WithdrawalJobData;
};

// ─── Job Options Configuration ───────────────────────────────

export interface QueueJobOptions {
    attempts: number;
    backoff: {
        type: 'exponential' | 'fixed';
        delay: number;
    };
    delay?: number;
    priority?: number;
    removeOnComplete?: boolean | number | { age: number; count: number };
    removeOnFail?: boolean | number | { age: number; count: number };
}

// ─── Default Retry Configuration ─────────────────────────────

export const DEFAULT_RETRY_CONFIG: QueueJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
    removeOnComplete: { age: 86400, count: 100 }, // Keep 100 completed jobs for 24h
    removeOnFail: { age: 604800, count: 500 },     // Keep 500 failed jobs for 7d
} as const;

// ─── Processor Context (passed to each processor) ────────────

export interface ProcessorContext {
    jobId: string;
    attemptNumber: number;
    maxAttempts: number;
    timestamp: Date;
    log: (message: string, meta?: Record<string, any>) => void;
}

// ─── Job Result Wrapper ──────────────────────────────────────

export interface JobResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    retryable?: boolean;
}
