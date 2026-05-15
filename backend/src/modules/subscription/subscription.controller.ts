/**
 * GEM Z — Subscription Controller
 *
 * Handles HTTP requests for recurring subscription management:
 *   - List my subscriptions
 *   - Create subscription
 *   - Cancel subscription
 *   - Pause subscription
 *   - Resume subscription
 *   - Get invoices
 *   - Admin: trigger renewals
 *
 * Delegates business logic to the existing recurring.service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger, logAudit } from '../../core/logging/logger';
import { db } from '../../core/database/db';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';
import * as RecurringService from './recurring.service';

const log = createLogger('subscription-controller');

export class SubscriptionController {
    /**
     * GET /api/v1/subscriptions
     * List current user's subscriptions.
     */
    static async listSubscriptions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            // Fetch subscriptions for user — we need to query by user_id from the subscriptions table
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
                WHERE s.user_id = $1
                ORDER BY s.created_at DESC
                `,
                [userId]
            );

            const subscriptions = result.rows.map((row) => ({
                id: String(row.id),
                userId: String(row.userId),
                planId: String(row.planId),
                planName: row.planName || 'Unknown Plan',
                status: row.status,
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

            res.status(200).json({
                success: true,
                subscriptions,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/subscriptions
     * Create a new subscription.
     */
    static async createSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { planId, autoRenew = true } = req.body;

            if (!planId) {
                throw new ValidationError('planId is required', ErrorCode.MISSING_FIELD);
            }

            // Verify plan exists
            const planRes = await db.query(
                'SELECT id, name, price_egp, duration_days FROM plans WHERE id = $1 AND is_active = TRUE',
                [planId]
            );

            if (planRes.rowCount === 0 || !planRes.rowCount) {
                throw new NotFoundError('Plan not found or inactive', ErrorCode.NOT_FOUND_PLAN);
            }

            const plan = planRes.rows[0];

            // Check wallet balance
            const walletRes = await db.query(
                'SELECT balance_egp FROM wallets WHERE user_id = $1',
                [userId]
            );
            const balance = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance_egp) || 0 : 0;

            if (balance < parseFloat(plan.price_egp)) {
                throw new ValidationError(
                    `Insufficient wallet balance. Required: ${plan.price_egp} EGP, Available: ${balance} EGP`,
                    ErrorCode.WALLET_INSUFFICIENT_FUNDS
                );
            }

            const client = await db.connect();
            try {
                await client.query('BEGIN');

                // Deduct from wallet
                await client.query(
                    `
                    UPDATE wallets
                    SET balance_egp = balance_egp - $1, updated_at = NOW()
                    WHERE user_id = $2 AND balance_egp >= $1
                    `,
                    [plan.price_egp, userId]
                );

                // Create transaction record
                const txnRes = await client.query(
                    `
                    INSERT INTO transactions (user_id, type, amount, currency, description, status, created_at)
                    VALUES ($1, 'subscription_purchase', $2, 'EGP', $3, 'completed', NOW())
                    RETURNING id
                    `,
                    [userId, plan.price_egp, `Subscription: ${plan.name}`]
                );
                const transactionId = txnRes.rows[0].id;

                // Calculate end date
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + (plan.duration_days || 30));

                // Create subscription
                const { rows } = await client.query(
                    `
                    INSERT INTO subscriptions (user_id, plan_id, status, start_date, end_date, auto_renew, retry_count, created_at, updated_at)
                    VALUES ($1, $2, 'active', NOW(), $3, $4, 0, NOW(), NOW())
                    RETURNING id, user_id as "userId", plan_id as "planId", status,
                              start_date as "startDate", end_date as "endDate",
                              auto_renew as "autoRenew", created_at as "createdAt"
                    `,
                    [userId, planId, endDate, autoRenew]
                );

                await client.query('COMMIT');

                const subscription = rows[0];
                log.info({ subscriptionId: subscription.id, userId }, 'Subscription created');
                logAudit('subscription_created', {
                    userId,
                    subscriptionId: subscription.id,
                    planId,
                    amount: plan.price_egp,
                    result: 'success',
                });

                res.status(201).json({
                    success: true,
                    message: 'Subscription created successfully',
                    subscription: {
                        id: String(subscription.id),
                        userId: String(subscription.userId),
                        planId: String(subscription.planId),
                        planName: plan.name,
                        status: subscription.status,
                        startDate: new Date(subscription.startDate),
                        endDate: new Date(subscription.endDate),
                        autoRenew: subscription.autoRenew,
                        renewalPrice: parseFloat(plan.price_egp),
                        currency: 'EGP',
                        createdAt: new Date(subscription.createdAt),
                    },
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/subscriptions/:id/cancel
     * Cancel a subscription.
     */
    static async cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const { reason } = req.body;

            // Verify ownership
            const ownerCheck = await db.query(
                'SELECT user_id FROM subscriptions WHERE id = $1',
                [id]
            );
            if (ownerCheck.rowCount === 0 || !ownerCheck.rowCount) {
                throw new NotFoundError('Subscription not found', ErrorCode.NOT_FOUND_RESOURCE);
            }
            if (String(ownerCheck.rows[0].user_id) !== userId) {
                throw new ForbiddenError('Not authorized to cancel this subscription', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            await RecurringService.cancelSubscription(id, reason || 'user_requested');

            res.status(200).json({
                success: true,
                message: 'Subscription cancelled successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/subscriptions/:id/pause
     * Pause a subscription.
     */
    static async pauseSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const { reason } = req.body;

            // Verify ownership
            const ownerCheck = await db.query(
                'SELECT user_id FROM subscriptions WHERE id = $1',
                [id]
            );
            if (ownerCheck.rowCount === 0 || !ownerCheck.rowCount) {
                throw new NotFoundError('Subscription not found', ErrorCode.NOT_FOUND_RESOURCE);
            }
            if (String(ownerCheck.rows[0].user_id) !== userId) {
                throw new ForbiddenError('Not authorized to pause this subscription', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            await RecurringService.pauseSubscription(id, reason);

            res.status(200).json({
                success: true,
                message: 'Subscription paused successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/subscriptions/:id/resume
     * Resume a paused subscription.
     */
    static async resumeSubscription(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;

            // Verify ownership
            const ownerCheck = await db.query(
                'SELECT user_id FROM subscriptions WHERE id = $1',
                [id]
            );
            if (ownerCheck.rowCount === 0 || !ownerCheck.rowCount) {
                throw new NotFoundError('Subscription not found', ErrorCode.NOT_FOUND_RESOURCE);
            }
            if (String(ownerCheck.rows[0].user_id) !== userId) {
                throw new ForbiddenError('Not authorized to resume this subscription', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            await RecurringService.resumeSubscription(id);

            res.status(200).json({
                success: true,
                message: 'Subscription resumed successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/subscriptions/:id/invoices
     * Get invoices for a subscription.
     */
    static async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;

            // Verify ownership
            const ownerCheck = await db.query(
                'SELECT user_id FROM subscriptions WHERE id = $1',
                [id]
            );
            if (ownerCheck.rowCount === 0 || !ownerCheck.rowCount) {
                throw new NotFoundError('Subscription not found', ErrorCode.NOT_FOUND_RESOURCE);
            }
            if (String(ownerCheck.rows[0].user_id) !== userId) {
                throw new ForbiddenError('Not authorized to view these invoices', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            // Fetch invoices from transactions
            const result = await db.query(
                `
                SELECT
                    id,
                    user_id as "userId",
                    type,
                    amount,
                    currency,
                    description,
                    status,
                    subscription_id as "subscriptionId",
                    created_at as "createdAt"
                FROM transactions
                WHERE subscription_id = $1
                ORDER BY created_at DESC
                `,
                [id]
            );

            const invoices = result.rows.map((row) => ({
                id: String(row.id),
                userId: String(row.userId),
                type: row.type,
                amount: parseFloat(row.amount),
                currency: row.currency,
                description: row.description,
                status: row.status,
                subscriptionId: row.subscriptionId ? String(row.subscriptionId) : null,
                createdAt: new Date(row.createdAt),
            }));

            res.status(200).json({
                success: true,
                invoices,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/subscriptions/process-renewals
     * Admin: trigger subscription renewals.
     */
    static async processRenewals(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            const role = req.user?.role;

            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            if (role !== 'super_admin' && role !== 'admin') {
                throw new ForbiddenError('Admin access required', ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
            }

            log.info({ adminId: userId }, 'Manual renewal processing triggered');

            const results = await RecurringService.processRenewals();

            const renewed = results.filter((r) => r.action === 'renewed').length;
            const failed = results.filter((r) => r.action === 'failed').length;
            const cancelled = results.filter((r) => r.action === 'cancelled').length;

            logAudit('renewals_processed_manually', {
                userId,
                result: 'success',
                renewed,
                failed,
                cancelled,
            });

            res.status(200).json({
                success: true,
                message: 'Renewal processing complete',
                summary: {
                    renewed,
                    failed,
                    cancelled,
                    total: results.length,
                },
                results,
            });
        } catch (error) {
            next(error);
        }
    }
}
