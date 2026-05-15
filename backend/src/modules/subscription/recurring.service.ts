/**
 * GEM Z — Auto-Renewal Subscription Service
 *
 * Handles automated subscription renewals:
 *   - Cron job: check subscriptions expiring in 24h
 *   - Auto-renew if wallet has sufficient balance
 *   - Send reminder notification 3 days before expiry
 *   - Handle failed renewals (retry 3 times, then cancel)
 *   - Grace period: 3 days after expiry
 *   - Pause/resume subscriptions
 *
 * Depends on: wallet service, push service, email service.
 */

import { createLogger } from '../../core/logging/logger';
import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import {
    NotFoundError,
    ValidationError,
    WalletError,
    ServerError,
} from '../../core/errors';
import { sendToUser } from '../../core/push/push.service';
import { logAudit } from '../../core/logging/logger';

const log = createLogger('recurring');

// ─── Types ──────────────────────────────────────────────────────

export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    planName: string;
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    renewalPrice: number;
    currency: string;
    autoRenew: boolean;
    retryCount: number;
    gracePeriodEnd?: Date | null;
    pausedAt?: Date | null;
    cancelledAt?: Date | null;
    cancellationReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type SubscriptionStatus =
    | 'active'
    | 'expiring_soon'
    | 'grace_period'
    | 'paused'
    | 'cancelled'
    | 'expired';

export interface RenewalResult {
    subscriptionId: string;
    userId: string;
    success: boolean;
    action: 'renewed' | 'failed' | 'cancelled' | 'reminded' | 'skipped';
    message: string;
    newExpiryDate?: Date;
    error?: string;
    timestamp: Date;
}

export interface WalletSnapshot {
    userId: string;
    balance: number;
    currency: string;
    sufficient: boolean;
}

// ─── Configuration ──────────────────────────────────────────────

/** Days before expiry to send reminder */
const REMINDER_DAYS_BEFORE = 3;

/** Hours before expiry to attempt auto-renewal */
const RENEWAL_HOURS_BEFORE = 24;

/** Maximum retry attempts for failed renewals */
const MAX_RETRY_COUNT = 3;

/** Grace period in days after subscription expiry */
const GRACE_PERIOD_DAYS = 3;

/** Redis key prefix for renewal tracking */
const RENEWAL_LOCK_PREFIX = 'gemz:renewal_lock:';
const REMINDER_SENT_PREFIX = 'gemz:reminder_sent:';

// ─── Subscription Queries ───────────────────────────────────────

/**
 * Get all subscriptions expiring within a given number of hours.
 */
export async function getExpiringSubscriptions(hours: number): Promise<Subscription[]> {
    const result = await db.query(
        `
        SELECT
            s.id,
            s.user_id as "userId",
            s.plan_id as "planId",
            p.name as "planName",
            s.status,
            s.start_date as "startDate",
            s.end_date as "endDate",
            p.price_egp as "renewalPrice",
            'EGP' as "currency",
            s.auto_renew as "autoRenew",
            s.retry_count as "retryCount",
            s.grace_period_end as "gracePeriodEnd",
            s.paused_at as "pausedAt",
            s.cancelled_at as "cancelledAt",
            s.cancellation_reason as "cancellationReason",
            s.created_at as "createdAt",
            s.updated_at as "updatedAt"
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status IN ('active', 'expiring_soon')
          AND s.auto_renew = TRUE
          AND s.paused_at IS NULL
          AND s.cancelled_at IS NULL
          AND s.end_date BETWEEN NOW() AND NOW() + INTERVAL '${hours} hours'
        ORDER BY s.end_date ASC
        `
    );

    return result.rows.map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        planId: String(row.planId),
        planName: row.planName || 'Unknown Plan',
        status: row.status as SubscriptionStatus,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        renewalPrice: parseFloat(row.renewalPrice) || 0,
        currency: row.currency || 'EGP',
        autoRenew: row.autoRenew,
        retryCount: parseInt(row.retryCount) || 0,
        gracePeriodEnd: row.gracePeriodEnd ? new Date(row.gracePeriodEnd) : null,
        pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
        cancelledAt: row.cancelledAt ? new Date(row.cancelledAt) : null,
        cancellationReason: row.cancellationReason || null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    }));
}

/**
 * Get subscriptions that need reminder notifications (expiring in ~3 days).
 */
export async function getSubscriptionsNeedingReminder(): Promise<Subscription[]> {
    const result = await db.query(
        `
        SELECT
            s.id,
            s.user_id as "userId",
            s.plan_id as "planId",
            p.name as "planName",
            s.status,
            s.start_date as "startDate",
            s.end_date as "endDate",
            p.price_egp as "renewalPrice",
            'EGP' as "currency",
            s.auto_renew as "autoRenew",
            s.retry_count as "retryCount",
            s.grace_period_end as "gracePeriodEnd",
            s.paused_at as "pausedAt",
            s.cancelled_at as "cancelledAt",
            s.cancellation_reason as "cancellationReason",
            s.created_at as "createdAt",
            s.updated_at as "updatedAt"
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status IN ('active', 'expiring_soon')
          AND s.paused_at IS NULL
          AND s.cancelled_at IS NULL
          AND s.end_date BETWEEN NOW() + INTERVAL '${REMINDER_DAYS_BEFORE - 1} days'
                              AND NOW() + INTERVAL '${REMINDER_DAYS_BEFORE} days'
        ORDER BY s.end_date ASC
        `
    );

    return result.rows.map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        planId: String(row.planId),
        planName: row.planName || 'Unknown Plan',
        status: row.status as SubscriptionStatus,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        renewalPrice: parseFloat(row.renewalPrice) || 0,
        currency: row.currency || 'EGP',
        autoRenew: row.autoRenew,
        retryCount: parseInt(row.retryCount) || 0,
        gracePeriodEnd: row.gracePeriodEnd ? new Date(row.gracePeriodEnd) : null,
        pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
        cancelledAt: row.cancelledAt ? new Date(row.cancelledAt) : null,
        cancellationReason: row.cancellationReason || null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    }));
}

/**
 * Get subscriptions currently in grace period.
 */
export async function getGracePeriodSubscriptions(): Promise<Subscription[]> {
    const result = await db.query(
        `
        SELECT
            s.id,
            s.user_id as "userId",
            s.plan_id as "planId",
            p.name as "planName",
            s.status,
            s.start_date as "startDate",
            s.end_date as "endDate",
            p.price_egp as "renewalPrice",
            'EGP' as "currency",
            s.auto_renew as "autoRenew",
            s.retry_count as "retryCount",
            s.grace_period_end as "gracePeriodEnd",
            s.paused_at as "pausedAt",
            s.cancelled_at as "cancelledAt",
            s.cancellation_reason as "cancellationReason",
            s.created_at as "createdAt",
            s.updated_at as "updatedAt"
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status = 'grace_period'
          AND s.grace_period_end > NOW()
          AND s.auto_renew = TRUE
          AND s.paused_at IS NULL
        ORDER BY s.grace_period_end ASC
        `
    );

    return result.rows.map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        planId: String(row.planId),
        planName: row.planName || 'Unknown Plan',
        status: row.status as SubscriptionStatus,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        renewalPrice: parseFloat(row.renewalPrice) || 0,
        currency: row.currency || 'EGP',
        autoRenew: row.autoRenew,
        retryCount: parseInt(row.retryCount) || 0,
        gracePeriodEnd: row.gracePeriodEnd ? new Date(row.gracePeriodEnd) : null,
        pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
        cancelledAt: row.cancelledAt ? new Date(row.cancelledAt) : null,
        cancellationReason: row.cancellationReason || null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    }));
}

// ─── Wallet Check ───────────────────────────────────────────────

/**
 * Check if a user has sufficient wallet balance for renewal.
 */
async function checkWalletBalance(
    userId: string,
    requiredAmount: number
): Promise<WalletSnapshot> {
    const result = await db.query(
        'SELECT balance_egp, currency FROM wallets WHERE user_id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        return { userId, balance: 0, currency: 'EGP', sufficient: false };
    }

    const balance = parseFloat(result.rows[0].balance_egp) || 0;
    return {
        userId,
        balance,
        currency: result.rows[0].currency || 'EGP',
        sufficient: balance >= requiredAmount,
    };
}

// ─── Renewal Core Logic ─────────────────────────────────────────

/**
 * Renew a single subscription.
 * Deducts from wallet and extends the subscription period.
 */
async function renewSubscription(subscription: Subscription): Promise<RenewalResult> {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Check wallet balance
        const wallet = await checkWalletBalance(subscription.userId, subscription.renewalPrice);
        if (!wallet.sufficient) {
            await client.query('ROLLBACK');
            return {
                subscriptionId: subscription.id,
                userId: subscription.userId,
                success: false,
                action: 'failed',
                message: `Insufficient wallet balance: ${wallet.balance} EGP (required: ${subscription.renewalPrice} EGP)`,
                timestamp: new Date(),
            };
        }

        // 2. Deduct from wallet
        await client.query(
            `
            UPDATE wallets
            SET balance_egp = balance_egp - $1,
                updated_at = NOW()
            WHERE user_id = $2
              AND balance_egp >= $1
            `,
            [subscription.renewalPrice, subscription.userId]
        );

        // 3. Calculate new end date (extend by 30 days from current end)
        const newEndDate = new Date(subscription.endDate);
        newEndDate.setDate(newEndDate.getDate() + 30);

        // 4. Update subscription
        await client.query(
            `
            UPDATE subscriptions
            SET end_date = $1,
                status = 'active',
                retry_count = 0,
                grace_period_end = NULL,
                updated_at = NOW()
            WHERE id = $2
            `,
            [newEndDate.toISOString(), subscription.id]
        );

        // 5. Record the transaction
        await client.query(
            `
            INSERT INTO transactions (user_id, type, amount, currency, description, status, subscription_id, created_at)
            VALUES ($1, 'subscription_renewal', $2, $3, $4, 'completed', $5, NOW())
            `,
            [
                subscription.userId,
                subscription.renewalPrice,
                subscription.currency,
                `Auto-renewal: ${subscription.planName}`,
                subscription.id,
            ]
        );

        await client.query('COMMIT');

        // 6. Send renewal success notification
        try {
            await sendToUser(subscription.userId, {
                title: 'Subscription Renewed',
                body: `Your ${subscription.planName} subscription has been renewed until ${newEndDate.toLocaleDateString()}.`,
                url: '/subscriptions',
                tag: 'subscription_renewed',
            });
        } catch {
            // Notification failure is non-fatal
        }

        logAudit('subscription_auto_renewed', {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            amount: subscription.renewalPrice,
            result: 'success',
        });

        return {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            success: true,
            action: 'renewed',
            message: `Subscription renewed successfully. New expiry: ${newEndDate.toISOString()}`,
            newExpiryDate: newEndDate,
            timestamp: new Date(),
        };
    } catch (error) {
        await client.query('ROLLBACK');
        log.error(
            { error: (error as Error).message, subscriptionId: subscription.id },
            'Subscription renewal transaction failed'
        );

        return {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            success: false,
            action: 'failed',
            message: 'Renewal transaction failed',
            error: (error as Error).message,
            timestamp: new Date(),
        };
    } finally {
        client.release();
    }
}

// ─── Main Renewal Processor ─────────────────────────────────────

/**
 * Process all pending renewals.
 * This is the main entry point called by the cron job.
 * Checks for subscriptions expiring soon and attempts auto-renewal.
 *
 * @returns Array of renewal results
 */
export async function processRenewals(): Promise<RenewalResult[]> {
    log.info('Starting subscription renewal processing');

    const results: RenewalResult[] = [];

    // 1. Handle subscriptions in grace period (retry)
    const gracePeriodSubs = await getGracePeriodSubscriptions();
    log.info({ count: gracePeriodSubs.length }, `Found ${gracePeriodSubs.length} subscriptions in grace period`);

    for (const sub of gracePeriodSubs) {
        const lockKey = `${RENEWAL_LOCK_PREFIX}${sub.id}`;

        // Check if already processing
        const locked = await redisClient.get(lockKey);
        if (locked) {
            results.push({
                subscriptionId: sub.id,
                userId: sub.userId,
                success: false,
                action: 'skipped',
                message: 'Renewal already in progress',
                timestamp: new Date(),
            });
            continue;
        }

        // Set lock
        await redisClient.setex(lockKey, 300, '1'); // 5 min lock

        if (sub.retryCount >= MAX_RETRY_COUNT) {
            // Max retries reached — cancel subscription
            await cancelSubscription(sub.id, 'max_retries_exceeded');
            results.push({
                subscriptionId: sub.id,
                userId: sub.userId,
                success: false,
                action: 'cancelled',
                message: `Cancelled after ${MAX_RETRY_COUNT} failed renewal attempts`,
                timestamp: new Date(),
            });
            continue;
        }

        const result = await renewSubscription(sub);

        if (!result.success) {
            // Increment retry count
            await db.query(
                'UPDATE subscriptions SET retry_count = retry_count + 1, updated_at = NOW() WHERE id = $1',
                [sub.id]
            );
        }

        results.push(result);
        await redisClient.del(lockKey);
    }

    // 2. Handle subscriptions expiring in 24h
    const expiringSubs = await getExpiringSubscriptions(RENEWAL_HOURS_BEFORE);
    log.info({ count: expiringSubs.length }, `Found ${expiringSubs.length} subscriptions expiring within ${RENEWAL_HOURS_BEFORE}h`);

    for (const sub of expiringSubs) {
        const lockKey = `${RENEWAL_LOCK_PREFIX}${sub.id}`;
        const locked = await redisClient.get(lockKey);
        if (locked) continue;

        await redisClient.setex(lockKey, 300, '1');

        const result = await renewSubscription(sub);

        if (!result.success) {
            // Move to grace period
            const graceEnd = new Date();
            graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

            await db.query(
                `
                UPDATE subscriptions
                SET status = 'grace_period',
                    grace_period_end = $1,
                    retry_count = retry_count + 1,
                    updated_at = NOW()
                WHERE id = $2
                `,
                [graceEnd.toISOString(), sub.id]
            );

            // Notify user about grace period
            try {
                await sendToUser(sub.userId, {
                    title: 'Subscription Renewal Failed',
                    body: `We couldn't renew your ${sub.planName} subscription. You have ${GRACE_PERIOD_DAYS} days of grace period. Please top up your wallet.`,
                    url: '/wallet',
                    tag: 'renewal_failed',
                    urgency: 'high',
                });
            } catch {
                // Notification failure is non-fatal
            }
        }

        results.push(result);
        await redisClient.del(lockKey);
    }

    const renewed = results.filter((r) => r.action === 'renewed').length;
    const failed = results.filter((r) => r.action === 'failed').length;
    const cancelled = results.filter((r) => r.action === 'cancelled').length;

    log.info(
        { renewed, failed, cancelled, total: results.length },
        `Renewal processing complete: ${renewed} renewed, ${failed} failed, ${cancelled} cancelled`
    );

    return results;
}

// ─── Reminder Notifications ─────────────────────────────────────

/**
 * Send expiry reminder notifications to users whose subscriptions
 * are expiring in ~3 days.
 */
export async function sendExpiryReminders(): Promise<RenewalResult[]> {
    log.info('Sending expiry reminders');

    const subscriptions = await getSubscriptionsNeedingReminder();
    const results: RenewalResult[] = [];

    for (const sub of subscriptions) {
        const reminderKey = `${REMINDER_SENT_PREFIX}${sub.id}`;

        // Check if already reminded
        const alreadySent = await redisClient.get(reminderKey);
        if (alreadySent) {
            results.push({
                subscriptionId: sub.id,
                userId: sub.userId,
                success: true,
                action: 'skipped',
                message: 'Reminder already sent',
                timestamp: new Date(),
            });
            continue;
        }

        try {
            // Update status to expiring_soon
            await db.query(
                "UPDATE subscriptions SET status = 'expiring_soon', updated_at = NOW() WHERE id = $1",
                [sub.id]
            );

            // Send push notification
            await sendToUser(sub.userId, {
                title: 'Subscription Expiring Soon',
                body: `Your ${sub.planName} subscription expires on ${sub.endDate.toLocaleDateString()}. Renew now to avoid interruption.`,
                url: '/subscriptions',
                tag: 'subscription_expiring',
                requireInteraction: true,
            });

            // Mark reminder as sent (24h TTL)
            await redisClient.setex(reminderKey, 86400 * REMINDER_DAYS_BEFORE, '1');

            results.push({
                subscriptionId: sub.id,
                userId: sub.userId,
                success: true,
                action: 'reminded',
                message: 'Expiry reminder sent',
                timestamp: new Date(),
            });
        } catch (error) {
            log.error(
                { error: (error as Error).message, subscriptionId: sub.id },
                'Failed to send expiry reminder'
            );
            results.push({
                subscriptionId: sub.id,
                userId: sub.userId,
                success: false,
                action: 'failed',
                message: 'Failed to send reminder',
                error: (error as Error).message,
                timestamp: new Date(),
            });
        }
    }

    const sent = results.filter((r) => r.action === 'reminded').length;
    log.info({ sent, total: subscriptions.length }, 'Expiry reminders processed');

    return results;
}

/**
 * Schedule the renewal check (called by cron).
 * Combines reminders + renewals in a single scheduled run.
 */
export async function scheduleRenewalCheck(): Promise<void> {
    log.info('Running scheduled renewal check');

    // Step 1: Send reminders (3 days before)
    await sendExpiryReminders();

    // Step 2: Process renewals (24h before expiry + grace period)
    await processRenewals();

    // Step 3: Clean up expired subscriptions (past grace period)
    await cleanupExpiredSubscriptions();

    log.info('Scheduled renewal check complete');
}

// ─── Failed Renewal Handler ─────────────────────────────────────

/**
 * Handle a failed renewal for a specific subscription.
 * Increments retry count and moves to grace period if needed.
 *
 * @param subscriptionId - Subscription ID
 */
export async function handleFailedRenewal(subscriptionId: string): Promise<RenewalResult> {
    const result = await db.query(
        `
        SELECT
            s.id,
            s.user_id as "userId",
            s.plan_id as "planId",
            p.name as "planName",
            s.status,
            s.end_date as "endDate",
            p.price_egp as "renewalPrice",
            s.retry_count as "retryCount"
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.id = $1
        `,
        [subscriptionId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Subscription not found');
    }

    const sub = result.rows[0];
    const retryCount = (parseInt(sub.retryCount) || 0) + 1;

    if (retryCount >= MAX_RETRY_COUNT) {
        await cancelSubscription(subscriptionId, 'max_retries_exceeded');
        return {
            subscriptionId,
            userId: String(sub.userId),
            success: false,
            action: 'cancelled',
            message: `Cancelled after ${MAX_RETRY_COUNT} failed attempts`,
            timestamp: new Date(),
        };
    }

    // Move to grace period
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

    await db.query(
        `
        UPDATE subscriptions
        SET status = 'grace_period',
            grace_period_end = $1,
            retry_count = $2,
            updated_at = NOW()
        WHERE id = $3
        `,
        [graceEnd.toISOString(), retryCount, subscriptionId]
    );

    // Notify user
    try {
        await sendToUser(String(sub.userId), {
            title: 'Subscription Renewal Failed',
            body: `Renewal for ${sub.planName} failed. You have ${GRACE_PERIOD_DAYS} days grace period. Please top up your wallet.`,
            url: '/wallet',
            tag: 'renewal_failed',
            urgency: 'high',
        });
    } catch {
        // Non-fatal
    }

    return {
        subscriptionId,
        userId: String(sub.userId),
        success: false,
        action: 'failed',
        message: `Renewal failed. Retry ${retryCount}/${MAX_RETRY_COUNT}. Grace period until ${graceEnd.toISOString()}`,
        timestamp: new Date(),
    };
}

// ─── Pause / Resume ─────────────────────────────────────────────

/**
 * Pause a subscription.
 * The subscription will not auto-renew while paused.
 *
 * @param subscriptionId - Subscription ID
 * @param reason - Reason for pausing
 */
export async function pauseSubscription(
    subscriptionId: string,
    reason?: string
): Promise<void> {
    const result = await db.query(
        `
        UPDATE subscriptions
        SET paused_at = NOW(),
            status = 'paused',
            updated_at = NOW()
        WHERE id = $1
          AND paused_at IS NULL
        RETURNING user_id
        `,
        [subscriptionId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Subscription not found or already paused');
    }

    log.info({ subscriptionId, reason }, 'Subscription paused');
    logAudit('subscription_paused', {
        subscriptionId,
        reason,
        result: 'success',
    });
}

/**
 * Resume a paused subscription.
 *
 * @param subscriptionId - Subscription ID
 */
export async function resumeSubscription(subscriptionId: string): Promise<void> {
    const result = await db.query(
        `
        UPDATE subscriptions
        SET paused_at = NULL,
            status = 'active',
            updated_at = NOW()
        WHERE id = $1
          AND paused_at IS NOT NULL
        RETURNING user_id
        `,
        [subscriptionId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Subscription not found or not paused');
    }

    log.info({ subscriptionId }, 'Subscription resumed');
    logAudit('subscription_resumed', {
        subscriptionId,
        result: 'success',
    });
}

/**
 * Cancel a subscription.
 *
 * @param subscriptionId - Subscription ID
 * @param reason - Cancellation reason
 */
export async function cancelSubscription(
    subscriptionId: string,
    reason: string = 'user_requested'
): Promise<void> {
    await db.query(
        `
        UPDATE subscriptions
        SET cancelled_at = NOW(),
            cancellation_reason = $2,
            status = 'cancelled',
            auto_renew = FALSE,
            updated_at = NOW()
        WHERE id = $1
        `,
        [subscriptionId, reason]
    );

    log.info({ subscriptionId, reason }, 'Subscription cancelled');
    logAudit('subscription_cancelled', {
        subscriptionId,
        reason,
        result: 'success',
    });
}

// ─── Cleanup ────────────────────────────────────────────────────

/**
 * Clean up fully expired subscriptions that are past their grace period.
 */
async function cleanupExpiredSubscriptions(): Promise<number> {
    const result = await db.query(
        `
        UPDATE subscriptions
        SET status = 'expired',
            auto_renew = FALSE,
            updated_at = NOW()
        WHERE status = 'grace_period'
          AND grace_period_end < NOW()
          AND status != 'expired'
        RETURNING id
        `
    );

    const count = result.rows.length;
    if (count > 0) {
        log.info({ expired: count }, `Marked ${count} subscriptions as expired`);
    }
    return count;
}

/**
 * Get subscription by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const result = await db.query(
        `
        SELECT
            s.id,
            s.user_id as "userId",
            s.plan_id as "planId",
            p.name as "planName",
            s.status,
            s.start_date as "startDate",
            s.end_date as "endDate",
            p.price_egp as "renewalPrice",
            'EGP' as "currency",
            s.auto_renew as "autoRenew",
            s.retry_count as "retryCount",
            s.grace_period_end as "gracePeriodEnd",
            s.paused_at as "pausedAt",
            s.cancelled_at as "cancelledAt",
            s.cancellation_reason as "cancellationReason",
            s.created_at as "createdAt",
            s.updated_at as "updatedAt"
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.id = $1
        `,
        [subscriptionId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: String(row.id),
        userId: String(row.userId),
        planId: String(row.planId),
        planName: row.planName || 'Unknown Plan',
        status: row.status as SubscriptionStatus,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        renewalPrice: parseFloat(row.renewalPrice) || 0,
        currency: row.currency || 'EGP',
        autoRenew: row.autoRenew,
        retryCount: parseInt(row.retryCount) || 0,
        gracePeriodEnd: row.gracePeriodEnd ? new Date(row.gracePeriodEnd) : null,
        pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
        cancelledAt: row.cancelledAt ? new Date(row.cancelledAt) : null,
        cancellationReason: row.cancellationReason || null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}
