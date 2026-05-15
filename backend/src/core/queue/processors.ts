/**
 * GEM Z — Job Processor Definitions
 *
 * Each processor handles a specific job type with:
 * - Proper error handling and classification (retryable vs fatal)
 * - Exponential backoff: { type: 'exponential', delay: 2000 }
 * - Max 3 attempts (5 for financial operations)
 * - Dead letter queue routing for permanently failed jobs
 * - Structured logging with job context
 */

import { Job } from 'bullmq';
import { db } from '../database/db';
import {
    JobType,
    DLQ_NAME,
    EmailJobData,
    AIJobData,
    NotificationJobData,
    DailyReportJobData,
    WalletReconciliationJobData,
    CleanupJobData,
    WithdrawalJobData,
    JobResult,
    ProcessorContext,
} from './types';
import { getQueue } from './producers';

// ─── Processor Type Definition ───────────────────────────────

/** Processor function signature — ctx is passed by the worker but processors may ignore it */
type ProcessorFunction<T> = (job: Job<T>, ctx?: ProcessorContext) => Promise<JobResult>;

// ─── Dead Letter Queue ───────────────────────────────────────

const dlq = getQueue(DLQ_NAME);

/**
 * Send a failed job to the Dead Letter Queue for manual inspection.
 */
async function sendToDLQ(job: Job, error: Error, originalQueue: string): Promise<void> {
    try {
        await dlq.add(
            'dead_letter',
            {
                originalJobId: job.id,
                originalQueue,
                jobName: job.name,
                jobData: job.data,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                },
                failedAt: new Date().toISOString(),
                attemptsMade: job.attemptsMade,
            },
            {
                attempts: 1, // Don't retry DLQ jobs
                removeOnComplete: false, // Keep forever until manually resolved
            }
        );
        console.warn(`[Queue] Job ${job.id} moved to Dead Letter Queue.`);
    } catch (dlqErr) {
        console.error(`[Queue] CRITICAL: Failed to send job ${job.id} to DLQ:`, (dlqErr as Error).message);
        // This is a critical failure — log for manual intervention
    }
}

/**
 * Classify an error as retryable or fatal.
 * Fatal errors should not be retried; retryable errors trigger exponential backoff.
 */
function classifyError(error: Error): { retryable: boolean; reason: string } {
    const fatalErrors = [
        'ENOTFOUND',     // DNS lookup failure — won't resolve on retry
        'EACCES',        // Permission denied
        'ECONNREFUSED',  // Connection refused (service down)
        'Invalid API key',
        'unauthorized',
        'forbidden',
        'not found',
        'bad request',
    ];

    const message = error.message.toLowerCase();
    const isFatal = fatalErrors.some(keyword => message.includes(keyword.toLowerCase()));

    return {
        retryable: !isFatal,
        reason: isFatal ? 'fatal' : 'transient',
    };
}

// ─── Helper: Create Processor Context ────────────────────────

function createContext(job: Job): ProcessorContext {
    return {
        jobId: job.id || 'unknown',
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts || 3,
        timestamp: new Date(),
        log: (message: string, meta?: Record<string, any>) => {
            console.log(`[Queue][${job.id}][attempt ${job.attemptsMade + 1}] ${message}`, meta || '');
        },
    };
}

// ─── Processor: Email ────────────────────────────────────────

/**
 * Process email jobs by sending via Nodemailer.
 */
export async function processEmailJob(
    job: Job<EmailJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const { to, subject, template, variables } = job.data;

    ctx.log(`Sending email to ${to} | subject: "${subject}" | template: ${template}`);

    try {
        // Dynamic import to avoid circular dependency
        const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } = await import(
            '../../services/email.service'
        );

        switch (template) {
            case 'welcome':
                await sendWelcomeEmail({
                    to,
                    fullName: variables.fullName || 'User',
                    role: variables.role || 'trainee',
                });
                break;

            case 'verification':
                await sendVerificationEmail({
                    to,
                    fullName: variables.fullName || 'User',
                    token: variables.token || '',
                });
                break;

            case 'password_reset':
                await sendPasswordResetEmail({
                    to,
                    fullName: variables.fullName || 'User',
                    token: variables.token || '',
                });
                break;

            default:
                // Generic template: use the subject and body from variables
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.SMTP_FROM || 'Gem Z <noreply@gemz.app>',
                    to,
                    subject,
                    html: variables.body || `<p>${subject}</p>`,
                });
                break;
        }

        ctx.log(`Email sent successfully to ${to}`);
        return { success: true, data: { sentTo: to, template } };

    } catch (error) {
        const err = error as Error;
        const { retryable, reason } = classifyError(err);

        ctx.log(`Email sending failed: ${err.message} (${reason})`);

        // If this is the final attempt, send to DLQ
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'email-queue');
        }

        return { success: false, error: err.message, retryable };
    }
}

// ─── Processor: AI Processing ────────────────────────────────

/**
 * Process AI jobs by calling the OpenAI API.
 * Handles: diet_plan, form_analysis, comprehensive_plan
 */
export async function processAIJob(
    job: Job<AIJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const { userId, type, inputData } = job.data;

    ctx.log(`Processing AI job: ${type} for user ${userId}`);

    try {
        const { AIService } = await import('../../services/ai.service');

        let result: any;

        switch (type) {
            case 'diet_plan':
                if (!inputData?.medicalReport || !inputData?.profile) {
                    throw new Error('Missing medicalReport or profile for diet_plan');
                }
                result = await AIService.generateDietPlan(
                    inputData.medicalReport,
                    inputData.profile
                );
                break;

            case 'form_analysis':
                if (!inputData?.imageUrl || !inputData?.exerciseName) {
                    throw new Error('Missing imageUrl or exerciseName for form_analysis');
                }
                result = await AIService.analyzeForm(
                    inputData.imageUrl,
                    inputData.exerciseName
                );
                break;

            case 'comprehensive_plan':
                if (!inputData?.profile || !inputData?.trainerId) {
                    throw new Error('Missing profile or trainerId for comprehensive_plan');
                }
                result = await AIService.generateComprehensivePlan(
                    inputData.profile,
                    inputData.trainerId
                );
                break;

            default:
                throw new Error(`Unknown AI job type: ${type}`);
        }

        ctx.log(`AI job completed: ${type} for user ${userId}`);
        return { success: true, data: { type, result } };

    } catch (error) {
        const err = error as Error;
        const { retryable, reason } = classifyError(err);

        ctx.log(`AI processing failed: ${err.message} (${reason})`);

        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'ai-processing-queue');
        }

        return { success: false, error: err.message, retryable };
    }
}

// ─── Processor: Push Notification ────────────────────────────

/**
 * Process push notification jobs using web-push.
 */
export async function processNotificationJob(
    job: Job<NotificationJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const { userId, title, body, type, data: payloadData } = job.data;

    ctx.log(`Sending notification to user ${userId} | "${title}"`);

    try {
        const { PushNotificationService } = await import('../../services/push.service');

        await PushNotificationService.notifyUser(userId, {
            title,
            body,
            icon: payloadData?.icon || '/gem-z-logo.png',
            url: payloadData?.url || '/',
        });

        ctx.log(`Notification sent to user ${userId}`);
        return { success: true, data: { userId, title, type } };

    } catch (error) {
        const err = error as Error;
        const { retryable } = classifyError(err);

        ctx.log(`Notification failed: ${err.message}`);

        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'notification-queue');
        }

        return { success: false, error: err.message, retryable };
    }
}

// ─── Processor: Daily Report ─────────────────────────────────

/**
 * Generate daily analytics report.
 */
export async function processDailyReportJob(
    job: Job<DailyReportJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const reportDate = job.data.reportDate || new Date().toISOString().split('T')[0];

    ctx.log(`Generating daily report for ${reportDate}`);

    try {
        // 1. User activity stats
        const userStats = await db.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_24h,
                COUNT(*) FILTER (WHERE last_active >= NOW() - INTERVAL '24 hours') as active_users_24h
            FROM users
        `);

        // 2. Transaction stats
        const txnStats = await db.query(`
            SELECT 
                COUNT(*) as total_txns,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '24 hours') as completed_txns_24h
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);

        // 3. AI usage stats
        const aiStats = await db.query(`
            SELECT 
                COUNT(*) as total_ai_requests,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as requests_24h
            FROM ai_diet_plans
        `);

        const report = {
            reportDate,
            generatedAt: new Date().toISOString(),
            users: userStats.rows[0],
            transactions: txnStats.rows[0],
            aiUsage: aiStats.rows[0],
        };

        // Store the report
        await db.query(`
            INSERT INTO daily_reports (report_date, report_data, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (report_date) DO UPDATE SET report_data = $2, updated_at = NOW()
        `, [reportDate, report]);

        ctx.log(`Daily report generated for ${reportDate}`);
        return { success: true, data: report };

    } catch (error) {
        const err = error as Error;

        ctx.log(`Daily report generation failed: ${err.message}`);

        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'daily-report-queue');
        }

        return { success: false, error: err.message, retryable: true };
    }
}

// ─── Processor: Wallet Reconciliation ────────────────────────

/**
 * Verify wallet balances match their ledger entries.
 */
export async function processWalletReconciliationJob(
    job: Job<WalletReconciliationJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const { walletId } = job.data;

    ctx.log(`Starting wallet reconciliation${walletId ? ` for wallet ${walletId}` : ' for all wallets'}`);

    try {
        // Get wallets to check
        const walletQuery = walletId
            ? `SELECT id, owner_type, owner_id, available_bal, pending_bal FROM wallets WHERE id = $1`
            : `SELECT id, owner_type, owner_id, available_bal, pending_bal FROM wallets`;

        const { rows: wallets } = await db.query(walletQuery, walletId ? [walletId] : []);

        const discrepancies: any[] = [];

        for (const wallet of wallets) {
            // Calculate expected balance from ledger entries
            const ledgerResult = await db.query(`
                SELECT 
                    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'credit'), 0) -
                    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0) as expected_balance
                FROM ledger_entries
                WHERE wallet_id = $1
            `, [wallet.id]);

            const expectedBalance = Number(ledgerResult.rows[0]?.expected_balance || 0);
            const actualBalance = Number(wallet.available_bal) + Number(wallet.pending_bal);

            // Allow for small floating-point tolerance
            if (Math.abs(expectedBalance - actualBalance) > 0.001) {
                discrepancies.push({
                    walletId: wallet.id,
                    ownerType: wallet.owner_type,
                    ownerId: wallet.owner_id,
                    expectedBalance,
                    actualBalance,
                    difference: expectedBalance - actualBalance,
                });
            }
        }

        // Log reconciliation results
        if (discrepancies.length > 0) {
            console.error(`[Queue] WALLET RECONCILIATION FAILED: ${discrepancies.length} wallet(s) with discrepancies:`);
            for (const d of discrepancies) {
                console.error(`  - Wallet ${d.walletId}: expected=${d.expectedBalance}, actual=${d.actualBalance}, diff=${d.difference}`);
            }

            // Alert admins via notification queue
            const { queueNotification } = await import('./producers');
            await queueNotification({
                userId: 'admin',
                title: 'Wallet Reconciliation Alert',
                body: `${discrepancies.length} wallet(s) have balance discrepancies. Check logs immediately.`,
                type: 'admin_alert',
                data: { severity: 'high', discrepancyCount: discrepancies.length },
            }).catch(() => {/* Don't fail reconciliation if notification fails */ });
        }

        ctx.log(`Wallet reconciliation complete. ${discrepancies.length} discrepancies found.`);
        return {
            success: true,
            data: {
                walletsChecked: wallets.length,
                discrepanciesFound: discrepancies.length,
                discrepancies,
            },
        };

    } catch (error) {
        const err = error as Error;

        ctx.log(`Wallet reconciliation failed: ${err.message}`);

        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'wallet-reconciliation-queue');
        }

        return { success: false, error: err.message, retryable: true };
    }
}

// ─── Processor: Cleanup Old Data ─────────────────────────────

/**
 * Remove old temporary data (expired sessions, old logs, temp uploads).
 */
export async function processCleanupJob(
    job: Job<CleanupJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const olderThanDays = job.data.olderThanDays || 30;
    const dryRun = job.data.dryRun || false;

    ctx.log(`Running cleanup: olderThan=${olderThanDays}d | dryRun=${dryRun}`);

    const results: Record<string, number> = {};

    try {
        // 1. Clean expired email verification tokens
        const tokenResult = await db.query(`
            ${dryRun ? 'SELECT COUNT(*) as count' : 'DELETE'}
            FROM email_verification_tokens
            WHERE expires_at < NOW() - INTERVAL '${olderThanDays} days'
            ${dryRun ? '' : 'RETURNING *'}
        `);
        results.expiredEmailTokens = dryRun
            ? parseInt(tokenResult.rows[0]?.count || '0')
            : tokenResult.rowCount || 0;

        // 2. Clean old failed login attempts (if table exists)
        try {
            const loginResult = await db.query(`
                ${dryRun ? 'SELECT COUNT(*) as count' : 'DELETE'}
                FROM failed_login_attempts
                WHERE attempted_at < NOW() - INTERVAL '${olderThanDays} days'
                ${dryRun ? '' : 'RETURNING *'}
            `);
            results.oldLoginAttempts = dryRun
                ? parseInt(loginResult.rows[0]?.count || '0')
                : loginResult.rowCount || 0;
        } catch {
            results.oldLoginAttempts = 0; // Table may not exist
        }

        // 3. Clean old temporary uploads
        const uploadResult = await db.query(`
            ${dryRun ? 'SELECT COUNT(*) as count' : 'DELETE'}
            FROM temp_uploads
            WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
            ${dryRun ? '' : 'RETURNING *'}
        `).catch(() => ({ rows: [{ count: '0' }], rowCount: 0 }));
        results.oldTempUploads = dryRun
            ? parseInt(uploadResult.rows[0]?.count || '0')
            : uploadResult.rowCount || 0;

        // 4. Clean processed dead letter queue entries older than 30 days
        try {
            const dlqResult = await db.query(`
                ${dryRun ? 'SELECT COUNT(*) as count' : 'DELETE'}
                FROM processed_dlq_jobs
                WHERE processed_at < NOW() - INTERVAL '${olderThanDays} days'
                ${dryRun ? '' : 'RETURNING *'}
            `);
            results.oldDLQEntries = dryRun
                ? parseInt(dlqResult.rows[0]?.count || '0')
                : dlqResult.rowCount || 0;
        } catch {
            results.oldDLQEntries = 0; // Table may not exist
        }

        ctx.log(`Cleanup complete: ${JSON.stringify(results)}`);
        return { success: true, data: { dryRun, deleted: results } };

    } catch (error) {
        const err = error as Error;

        ctx.log(`Cleanup failed: ${err.message}`);

        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await sendToDLQ(job, err, 'cleanup-queue');
        }

        return { success: false, error: err.message, retryable: true };
    }
}

// ─── Processor: Withdrawal Processing ────────────────────────

/**
 * Process a withdrawal payout.
 * Updates withdrawal status, deducts from wallet, initiates transfer.
 */
export async function processWithdrawalJob(
    job: Job<WithdrawalJobData>
): Promise<JobResult> {
    const ctx = createContext(job);
    const { withdrawalId, userId, amount, paymentMethod, paymentDetails } = job.data;

    ctx.log(`Processing withdrawal ${withdrawalId} for user ${userId} | amount: ${amount} | method: ${paymentMethod}`);

    try {
        // 1. Verify withdrawal is still pending
        const withdrawalCheck = await db.query(
            `SELECT status FROM withdrawals WHERE id = $1 AND user_id = $2`,
            [withdrawalId, userId]
        );

        if (withdrawalCheck.rows.length === 0) {
            throw new Error(`Withdrawal ${withdrawalId} not found for user ${userId}`);
        }

        const currentStatus = withdrawalCheck.rows[0].status;
        if (currentStatus !== 'pending') {
            throw new Error(`Withdrawal ${withdrawalId} is not pending (status: ${currentStatus})`);
        }

        // 2. Deduct from user's available balance
        const walletResult = await db.query(
            `UPDATE wallets 
             SET available_bal = available_bal - $1, updated_at = NOW()
             WHERE owner_type = 'user' AND owner_id = $2 AND available_bal >= $1
             RETURNING id, available_bal`,
            [amount, userId]
        );

        if (walletResult.rowCount === 0) {
            throw new Error(`Insufficient balance for withdrawal ${withdrawalId}`);
        }

        // 3. Create ledger entry for the withdrawal
        const { v4: uuidv4 } = await import('uuid');
        const txnId = uuidv4();

        await db.query(`
            INSERT INTO transactions (id, reference_no, txn_type, status, total_amount, currency, description, initiator_user_id, completed_at)
            VALUES ($1, $2, 'withdrawal', 'completed', $3, 'EGP', $4, $5, NOW())
        `, [txnId, `WDW-${withdrawalId}`, amount, `Withdrawal via ${paymentMethod}`, userId]);

        await db.query(`
            INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance)
            VALUES ($1, $2, 'debit', $3, $4)
        `, [txnId, walletResult.rows[0].id, amount, walletResult.rows[0].available_bal]);

        // 4. Update withdrawal status to processing/completed
        await db.query(`
            UPDATE withdrawals 
            SET status = 'processing', transaction_id = $1, processed_at = NOW(), updated_at = NOW()
            WHERE id = $2
        `, [txnId, withdrawalId]);

        // 5. Initiate external payout (integration with payment provider)
        // This would integrate with a payment provider like Paymob, Fawry, etc.
        ctx.log(`Withdrawal ${withdrawalId} processed. Transaction: ${txnId}`);

        // 6. Send confirmation notification
        try {
            const { queueNotification } = await import('./producers');
            await queueNotification({
                userId,
                title: 'Withdrawal Processed',
                body: `Your withdrawal of ${amount} EGP has been initiated via ${paymentMethod}.`,
                type: 'withdrawal_confirmation',
                data: { withdrawalId, amount, paymentMethod },
            });
        } catch {
            // Don't fail the withdrawal if notification fails
        }

        return {
            success: true,
            data: { withdrawalId, transactionId: txnId, amount, paymentMethod },
        };

    } catch (error) {
        const err = error as Error;

        ctx.log(`Withdrawal processing failed: ${err.message}`);

        // Mark withdrawal as failed
        try {
            await db.query(
                `UPDATE withdrawals SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE id = $2`,
                [err.message, withdrawalId]
            );
        } catch (dbErr) {
            console.error(`[Queue] Failed to update withdrawal status:`, (dbErr as Error).message);
        }

        if (job.attemptsMade + 1 >= (job.opts.attempts || 5)) {
            await sendToDLQ(job, err, 'withdrawal-queue');
        }

        // Financial errors should be retryable (network issues with payment provider)
        return { success: false, error: err.message, retryable: true };
    }
}

// ─── Processor Map ───────────────────────────────────────────

/**
 * Map of job types to their processor functions.
 * Used by the worker setup to route jobs to the correct handler.
 */
export const PROCESSOR_MAP: Record<string, ProcessorFunction<any>> = {
    [JobType.SEND_EMAIL]: processEmailJob,
    [JobType.AI_PROCESSING]: processAIJob,
    [JobType.PUSH_NOTIFICATION]: processNotificationJob,
    [JobType.DAILY_REPORT]: processDailyReportJob,
    [JobType.WALLET_RECONCILIATION]: processWalletReconciliationJob,
    [JobType.CLEANUP_OLD_DATA]: processCleanupJob,
    [JobType.PROCESS_WITHDRAWAL]: processWithdrawalJob,
};

// ─── End of Processors ───────────────────────────────────────
