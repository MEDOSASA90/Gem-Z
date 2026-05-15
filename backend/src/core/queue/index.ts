/**
 * GEM Z — Queue System Barrel Export
 *
 * Centralized exports for the BullMQ queue system.
 * Import everything queue-related from this single entry point.
 *
 * Usage:
 *   import { setupQueues, shutdownQueues, queueEmail, queueAIProcessing } from './core/queue';
 */

// ─── Core ────────────────────────────────────────────────────

export { createRedisConnection, getRedisConnection, closeRedisConnection, isRedisHealthy } from './connection';
export { setupQueues, shutdownQueues, getQueueHealth } from './setup';
export { setupQueueDashboard, setupQueueHealthEndpoint, requireAdminAuth } from './dashboard';

// ─── Producers ───────────────────────────────────────────────

export {
    queueEmail,
    queueAIProcessing,
    queueNotification,
    queueDailyReport,
    queueWalletReconciliation,
    queueCleanup,
    queueWithdrawalProcessing,
    getQueue,
    getAllQueues,
    getQueueNameMap,
} from './producers';

// ─── Types ───────────────────────────────────────────────────

export {
    JobType,
    QUEUE_NAMES,
    DLQ_NAME,
    DEFAULT_RETRY_CONFIG,
} from './types';

export type {
    EmailJobData,
    AIJobData,
    NotificationJobData,
    DailyReportJobData,
    WalletReconciliationJobData,
    CleanupJobData,
    WithdrawalJobData,
    QueueJobOptions,
    JobResult,
    ProcessorContext,
} from './types';
