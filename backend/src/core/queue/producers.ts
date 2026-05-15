/**
 * GEM Z — Job Producer Functions
 *
 * Typed producer functions for enqueueing background jobs.
 * Each producer validates input data, applies appropriate job options
 * (delays, retries, backoff), and returns the created Job instance.
 *
 * Usage:
 *   import { queueEmail, queueAIProcessing } from './producers';
 *   const job = await queueEmail({ to: 'user@gemz.app', subject: '...', template: '...', variables: {} });
 */

import { Queue, Job } from 'bullmq';
import { config } from '../../config';
import { getRedisConnection } from './connection';
import {
    JobType,
    QUEUE_NAMES,
    EmailJobData,
    AIJobData,
    NotificationJobData,
    DailyReportJobData,
    WalletReconciliationJobData,
    CleanupJobData,
    WithdrawalJobData,
    DEFAULT_RETRY_CONFIG,
} from './types';

// ─── Queue Registry ──────────────────────────────────────────

const queueRegistry = new Map<string, Queue>();

/**
 * Get or create a BullMQ queue instance.
 * Queues are singletons — reusing the same instance prevents duplicate connections.
 */
export function getQueue(name: string): Queue {
    if (queueRegistry.has(name)) {
        return queueRegistry.get(name)!;
    }

    const connection = getRedisConnection();

    const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
            ...DEFAULT_RETRY_CONFIG,
        },
    });

    queueRegistry.set(name, queue);
    return queue;
}

/**
 * Get all registered queues (for dashboard / health checks).
 */
export function getAllQueues(): Queue[] {
    return Array.from(queueRegistry.values());
}

/**
 * Get queue names for the dashboard.
 */
export function getQueueNameMap(): Record<string, string> {
    return { ...QUEUE_NAMES };
}

// ─── Typed Queue Getters ─────────────────────────────────────

function getEmailQueue(): Queue { return getQueue(QUEUE_NAMES.EMAIL); }
function getAIQueue(): Queue { return getQueue(QUEUE_NAMES.AI); }
function getNotificationQueue(): Queue { return getQueue(QUEUE_NAMES.NOTIFICATION); }
function getReportQueue(): Queue { return getQueue(QUEUE_NAMES.REPORT); }
function getWalletQueue(): Queue { return getQueue(QUEUE_NAMES.WALLET); }
function getCleanupQueue(): Queue { return getQueue(QUEUE_NAMES.CLEANUP); }
function getWithdrawalQueue(): Queue { return getQueue(QUEUE_NAMES.WITHDRAWAL); }

// ─── Producer: queueEmail ────────────────────────────────────

/**
 * Enqueue a transactional email to be sent via Nodemailer.
 *
 * @param data — Email parameters (recipient, subject, template, variables)
 * @returns The created BullMQ Job
 */
export async function queueEmail(data: EmailJobData): Promise<Job<EmailJobData>> {
    const queue = getEmailQueue();

    const job = await queue.add(
        JobType.SEND_EMAIL,
        data,
        {
            ...DEFAULT_RETRY_CONFIG,
            priority: 5, // Medium priority
        }
    );

    console.log(`[Queue] Email job queued: ${job.id} -> ${data.to} | subject: "${data.subject}"`);
    return job;
}

// ─── Producer: queueAIProcessing ─────────────────────────────

/**
 * Enqueue an AI processing job (diet plan, form analysis, comprehensive plan).
 *
 * @param data — AI job parameters (userId, type, inputData)
 * @returns The created BullMQ Job
 */
export async function queueAIProcessing(data: AIJobData): Promise<Job<AIJobData>> {
    const queue = getAIQueue();

    // Higher priority for form analysis (real-time user experience)
    const priority = data.type === 'form_analysis' ? 1 : 3;

    // Form analysis has shorter timeout; diet/comprehensive plans may take longer
    const delay = data.type === 'comprehensive_plan' ? 1000 : undefined;

    const job = await queue.add(
        JobType.AI_PROCESSING,
        data,
        {
            ...DEFAULT_RETRY_CONFIG,
            attempts: 3,
            priority,
            delay,
        }
    );

    console.log(`[Queue] AI job queued: ${job.id} -> type: ${data.type} | user: ${data.userId}`);
    return job;
}

// ─── Producer: queueNotification ─────────────────────────────

/**
 * Enqueue a push notification to be delivered to a user.
 *
 * @param data — Notification parameters (userId, title, body, type, data)
 * @returns The created BullMQ Job
 */
export async function queueNotification(data: NotificationJobData): Promise<Job<NotificationJobData>> {
    const queue = getNotificationQueue();

    const job = await queue.add(
        JobType.PUSH_NOTIFICATION,
        data,
        {
            ...DEFAULT_RETRY_CONFIG,
            priority: 2, // High priority — user-facing
            delay: data.type === 'scheduled' ? calculateScheduledDelay(data.data) : undefined,
        }
    );

    console.log(`[Queue] Notification job queued: ${job.id} -> user: ${data.userId} | "${data.title}"`);
    return job;
}

// ─── Producer: queueDailyReport ──────────────────────────────

/**
 * Enqueue daily analytics report generation.
 * Typically called by a cron job scheduler.
 *
 * @returns The created BullMQ Job
 */
export async function queueDailyReport(): Promise<Job<DailyReportJobData>> {
    const queue = getReportQueue();

    const job = await queue.add(
        JobType.DAILY_REPORT,
        { reportDate: new Date().toISOString().split('T')[0] },
        {
            ...DEFAULT_RETRY_CONFIG,
            priority: 10, // Low priority — background task
            // Prevent duplicate daily reports by using a unique job ID
            jobId: `daily-report-${new Date().toISOString().split('T')[0]}`,
        }
    );

    console.log(`[Queue] Daily report job queued: ${job.id}`);
    return job;
}

// ─── Producer: queueWalletReconciliation ─────────────────────

/**
 * Enqueue a wallet balance reconciliation job.
 * Verifies that all wallet balances match their ledger entries.
 *
 * @param data — Optional walletId to reconcile a specific wallet
 * @returns The created BullMQ Job
 */
export async function queueWalletReconciliation(
    data?: WalletReconciliationJobData
): Promise<Job<WalletReconciliationJobData>> {
    const queue = getWalletQueue();

    const jobData: WalletReconciliationJobData = {
        walletId: data?.walletId,
        checkDate: new Date().toISOString(),
    };

    const job = await queue.add(
        JobType.WALLET_RECONCILIATION,
        jobData,
        {
            ...DEFAULT_RETRY_CONFIG,
            priority: 8,
            // Ensure only one reconciliation job runs at a time per wallet
            jobId: data?.walletId
                ? `wallet-recon-${data.walletId}`
                : `wallet-recon-all-${Date.now()}`,
        }
    );

    console.log(`[Queue] Wallet reconciliation job queued: ${job.id}${data?.walletId ? ` -> wallet: ${data.walletId}` : ' -> all wallets'}`);
    return job;
}

// ─── Producer: queueCleanup ──────────────────────────────────

/**
 * Enqueue a data cleanup job to remove old temporary data.
 *
 * @param data — Optional cleanup parameters (olderThanDays, dryRun)
 * @returns The created BullMQ Job
 */
export async function queueCleanup(data?: CleanupJobData): Promise<Job<CleanupJobData>> {
    const queue = getCleanupQueue();

    const jobData: CleanupJobData = {
        olderThanDays: data?.olderThanDays ?? 30, // Default: 30 days
        dryRun: data?.dryRun ?? false,
    };

    const job = await queue.add(
        JobType.CLEANUP_OLD_DATA,
        jobData,
        {
            ...DEFAULT_RETRY_CONFIG,
            priority: 10, // Low priority — background maintenance
        }
    );

    console.log(`[Queue] Cleanup job queued: ${job.id} -> olderThan: ${jobData.olderThanDays}d | dryRun: ${jobData.dryRun}`);
    return job;
}

// ─── Producer: queueWithdrawalProcessing ─────────────────────

/**
 * Enqueue a withdrawal payout processing job.
 *
 * @param data — Withdrawal parameters (withdrawalId, userId, amount, paymentMethod, paymentDetails)
 * @returns The created BullMQ Job
 */
export async function queueWithdrawalProcessing(data: WithdrawalJobData): Promise<Job<WithdrawalJobData>> {
    const queue = getWithdrawalQueue();

    const job = await queue.add(
        JobType.PROCESS_WITHDRAWAL,
        data,
        {
            ...DEFAULT_RETRY_CONFIG,
            attempts: 5, // More retries for financial operations
            priority: 1,  // Highest priority — financial transaction
            // Prevent duplicate processing of the same withdrawal
            jobId: `withdrawal-${data.withdrawalId}`,
        }
    );

    console.log(`[Queue] Withdrawal job queued: ${job.id} -> withdrawal: ${data.withdrawalId} | amount: ${data.amount} | user: ${data.userId}`);
    return job;
}

// ─── Helper: Calculate scheduled notification delay ──────────

function calculateScheduledDelay(data?: Record<string, any>): number | undefined {
    if (!data?.scheduledAt) return undefined;
    const scheduledTime = new Date(data.scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, scheduledTime - now);
    return delay > 0 ? delay : undefined;
}
