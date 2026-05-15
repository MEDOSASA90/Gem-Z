/**
 * GEM Z — Affiliate Program Service
 *
 * Business logic for affiliate marketing:
 * - Join program, generate referral codes/links
 * - Track clicks and conversions
 * - Calculate commissions (10% subscriptions, 5% store)
 * - Process payouts via bank transfer / InstaPay
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../../core/errors';

const log = createLogger('affiliate-service');

// ─── Types ──────────────────────────────────────────────────────

export interface Affiliate {
    id: string;
    userId: string;
    referralCode: string;
    referralLink: string;
    commissionRateSubscription: number;
    commissionRateStore: number;
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    balance: number;
    status: 'pending' | 'active' | 'suspended';
    payoutMethod: 'bank_transfer' | 'instapay' | null;
    payoutDetails: Record<string, any> | null;
    createdAt: string;
}

export interface AffiliateClick {
    id: string;
    affiliateId: string;
    ipAddress: string;
    userAgent: string;
    referrer: string | null;
    converted: boolean;
    createdAt: string;
}

export interface AffiliateConversion {
    id: string;
    affiliateId: string;
    clickId: string | null;
    orderId: string;
    orderType: 'subscription' | 'store';
    orderAmount: number;
    commissionRate: number;
    commissionEarned: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    createdAt: string;
}

export interface AffiliatePayout {
    id: string;
    affiliateId: string;
    amount: number;
    method: 'bank_transfer' | 'instapay';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    reference: string | null;
    notes: string | null;
    requestedAt: string;
    processedAt: string | null;
}

export interface AffiliateDashboard {
    affiliate: Affiliate;
    clicksThisMonth: number;
    conversionsThisMonth: number;
    earningsThisMonth: number;
    clicksLastMonth: number;
    conversionsLastMonth: number;
    earningsLastMonth: number;
    clickChart: { date: string; clicks: number }[];
    conversionChart: { date: string; conversions: number; earnings: number }[];
    recentConversions: AffiliateConversion[];
}

// ─── Service ────────────────────────────────────────────────────

export class AffiliateService {
    constructor(private pool: Pool) {}

    private generateReferralCode(userId: string): string {
        const prefix = 'GEMZ';
        const suffix = userId.slice(0, 6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${suffix}${random}`;
    }

    /**
     * Join the affiliate program.
     */
    async joinAffiliate(userId: string): Promise<Affiliate> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Check if already an affiliate
            const existing = await client.query(
                `SELECT id FROM affiliates WHERE user_id = $1`,
                [userId]
            );

            if (existing.rowCount && existing.rowCount > 0) {
                await client.query('ROLLBACK');
                throw new ConflictError('You are already an affiliate');
            }

            const referralCode = this.generateReferralCode(userId);
            const referralLink = `${process.env.APP_URL || 'https://gemz.com'}/register?ref=${referralCode}`;
            const affiliateId = uuidv4();

            const result = await client.query(
                `INSERT INTO affiliates (id, user_id, referral_code, referral_link, commission_rate_subscription, commission_rate_store, status)
                 VALUES ($1, $2, $3, $4, 0.10, 0.05, 'active')
                 RETURNING id, user_id as "userId", referral_code as "referralCode", referral_link as "referralLink",
                           commission_rate_subscription as "commissionRateSubscription", commission_rate_store as "commissionRateStore",
                           total_clicks as "totalClicks", total_conversions as "totalConversions", total_earnings as "totalEarnings",
                           balance, status, payout_method as "payoutMethod", payout_details as "payoutDetails", created_at as "createdAt"`,
                [affiliateId, userId, referralCode, referralLink]
            );

            await client.query('COMMIT');

            log.info({ userId, affiliateId }, 'User joined affiliate program');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get affiliate by user ID.
     */
    async getAffiliate(userId: string): Promise<Affiliate | null> {
        const result = await this.pool.query(
            `SELECT id, user_id as "userId", referral_code as "referralCode", referral_link as "referralLink",
                    commission_rate_subscription as "commissionRateSubscription", commission_rate_store as "commissionRateStore",
                    total_clicks as "totalClicks", total_conversions as "totalConversions", total_earnings as "totalEarnings",
                    balance, status, payout_method as "payoutMethod", payout_details as "payoutDetails", created_at as "createdAt"
             FROM affiliates WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0] || null;
    }

    /**
     * Record a click on a referral link.
     */
    async recordClick(referralCode: string, ipAddress: string, userAgent: string, referrer?: string): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const affiliateResult = await client.query(
                `SELECT id FROM affiliates WHERE referral_code = $1 AND status = 'active'`,
                [referralCode]
            );

            if (affiliateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            const affiliateId = affiliateResult.rows[0].id;

            await client.query(
                `INSERT INTO affiliate_clicks (id, affiliate_id, ip_address, user_agent, referrer)
                 VALUES ($1, $2, $3, $4, $5)`,
                [uuidv4(), affiliateId, ipAddress, userAgent, referrer || null]
            );

            await client.query(
                `UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = $1`,
                [affiliateId]
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, referralCode }, 'Failed to record click');
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Record a conversion (subscription or store purchase).
     */
    async recordConversion(
        affiliateId: string,
        orderId: string,
        orderType: 'subscription' | 'store',
        orderAmount: number
    ): Promise<AffiliateConversion> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const affiliateResult = await client.query(
                `SELECT commission_rate_subscription, commission_rate_store, status FROM affiliates WHERE id = $1`,
                [affiliateId]
            );

            if (affiliateResult.rowCount === 0) {
                throw new NotFoundError('Affiliate not found');
            }

            const affiliate = affiliateResult.rows[0];
            if (affiliate.status !== 'active') {
                throw new ValidationError('Affiliate account is not active');
            }

            const rate = orderType === 'subscription'
                ? parseFloat(affiliate.commission_rate_subscription)
                : parseFloat(affiliate.commission_rate_store);

            const commission = Math.round(orderAmount * rate * 100) / 100;

            const conversionResult = await client.query(
                `INSERT INTO affiliate_conversions (id, affiliate_id, order_id, order_type, order_amount, commission_rate, commission_earned, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                 RETURNING id, affiliate_id as "affiliateId", click_id as "clickId", order_id as "orderId", order_type as "orderType",
                           order_amount as "orderAmount", commission_rate as "commissionRate", commission_earned as "commissionEarned",
                           status, created_at as "createdAt"`,
                [uuidv4(), affiliateId, orderId, orderType, orderAmount, rate, commission]
            );

            await client.query(
                `UPDATE affiliates SET total_conversions = total_conversions + 1, total_earnings = total_earnings + $1, balance = balance + $1 WHERE id = $2`,
                [commission, affiliateId]
            );

            await client.query('COMMIT');

            log.info({ affiliateId, orderId, commission }, 'Affiliate conversion recorded');
            return conversionResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get affiliate dashboard data.
     */
    async getDashboard(userId: string): Promise<AffiliateDashboard> {
        const affiliate = await this.getAffiliate(userId);
        if (!affiliate) {
            throw new NotFoundError('You are not an affiliate yet. Join the program first.');
        }

        const affiliateId = affiliate.id;

        // This month stats
        const thisMonthResult = await this.pool.query(
            `SELECT
                (SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)) as clicks,
                (SELECT COUNT(*) FROM affiliate_conversions WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE) AND status != 'cancelled') as conversions,
                (SELECT COALESCE(SUM(commission_earned), 0) FROM affiliate_conversions WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE) AND status = 'confirmed') as earnings`,
            [affiliateId]
        );

        // Last month stats
        const lastMonthResult = await this.pool.query(
            `SELECT
                (SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE)) as clicks,
                (SELECT COUNT(*) FROM affiliate_conversions WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE) AND status != 'cancelled') as conversions,
                (SELECT COALESCE(SUM(commission_earned), 0) FROM affiliate_conversions WHERE affiliate_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE) AND status = 'confirmed') as earnings`,
            [affiliateId]
        );

        // Click chart (last 30 days)
        const clickChartResult = await this.pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as clicks
             FROM affiliate_clicks
             WHERE affiliate_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY DATE(created_at) ORDER BY date ASC`,
            [affiliateId]
        );

        // Conversion chart (last 30 days)
        const conversionChartResult = await this.pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as conversions, COALESCE(SUM(commission_earned), 0) as earnings
             FROM affiliate_conversions
             WHERE affiliate_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days' AND status != 'cancelled'
             GROUP BY DATE(created_at) ORDER BY date ASC`,
            [affiliateId]
        );

        // Recent conversions
        const recentConversionsResult = await this.pool.query(
            `SELECT id, affiliate_id as "affiliateId", click_id as "clickId", order_id as "orderId", order_type as "orderType",
                    order_amount as "orderAmount", commission_rate as "commissionRate", commission_earned as "commissionEarned",
                    status, created_at as "createdAt"
             FROM affiliate_conversions WHERE affiliate_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [affiliateId]
        );

        return {
            affiliate,
            clicksThisMonth: parseInt(thisMonthResult.rows[0]?.clicks || '0', 10),
            conversionsThisMonth: parseInt(thisMonthResult.rows[0]?.conversions || '0', 10),
            earningsThisMonth: parseFloat(thisMonthResult.rows[0]?.earnings || '0'),
            clicksLastMonth: parseInt(lastMonthResult.rows[0]?.clicks || '0', 10),
            conversionsLastMonth: parseInt(lastMonthResult.rows[0]?.conversions || '0', 10),
            earningsLastMonth: parseFloat(lastMonthResult.rows[0]?.earnings || '0'),
            clickChart: clickChartResult.rows,
            conversionChart: conversionChartResult.rows,
            recentConversions: recentConversionsResult.rows,
        };
    }

    /**
     * Request a payout.
     */
    async requestPayout(userId: string, amount: number, method: 'bank_transfer' | 'instapay', details: Record<string, any>): Promise<AffiliatePayout> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const affiliateResult = await client.query(
                `SELECT id, balance, status FROM affiliates WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            if (affiliateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Affiliate not found');
            }

            const affiliate = affiliateResult.rows[0];

            if (affiliate.status !== 'active') {
                await client.query('ROLLBACK');
                throw new ValidationError('Affiliate account is not active');
            }

            const balance = parseFloat(affiliate.balance);
            if (balance < amount) {
                await client.query('ROLLBACK');
                throw new ValidationError(`Insufficient balance. Available: ${balance.toFixed(2)}`);
            }

            if (amount < 100) {
                await client.query('ROLLBACK');
                throw new ValidationError('Minimum payout amount is EGP 100');
            }

            const payoutId = uuidv4();
            const payoutResult = await client.query(
                `INSERT INTO affiliate_payouts (id, affiliate_id, amount, method, status, notes)
                 VALUES ($1, $2, $3, $4, 'pending', $5)
                 RETURNING id, affiliate_id as "affiliateId", amount, method, status, reference, notes, requested_at as "requestedAt", processed_at as "processedAt"`,
                [payoutId, affiliate.id, amount, method, JSON.stringify(details)]
            );

            // Deduct balance
            await client.query(
                `UPDATE affiliates SET balance = balance - $1 WHERE id = $2`,
                [amount, affiliate.id]
            );

            // Update payout method details
            await client.query(
                `UPDATE affiliates SET payout_method = $1, payout_details = $2 WHERE id = $3`,
                [method, JSON.stringify(details), affiliate.id]
            );

            await client.query('COMMIT');

            log.info({ userId, payoutId, amount, method }, 'Payout requested');
            return payoutResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get payout history.
     */
    async getPayouts(userId: string): Promise<AffiliatePayout[]> {
        const affiliate = await this.getAffiliate(userId);
        if (!affiliate) {
            throw new NotFoundError('Affiliate not found');
        }

        const result = await this.pool.query(
            `SELECT id, affiliate_id as "affiliateId", amount, method, status, reference, notes,
                    requested_at as "requestedAt", processed_at as "processedAt"
             FROM affiliate_payouts WHERE affiliate_id = $1 ORDER BY requested_at DESC LIMIT 50`,
            [affiliate.id]
        );
        return result.rows;
    }

    /**
     * Update payout settings.
     */
    async updatePayoutSettings(userId: string, method: 'bank_transfer' | 'instapay', details: Record<string, any>): Promise<Affiliate> {
        const result = await this.pool.query(
            `UPDATE affiliates SET payout_method = $1, payout_details = $2
             WHERE user_id = $3
             RETURNING id, user_id as "userId", referral_code as "referralCode", referral_link as "referralLink",
                       commission_rate_subscription as "commissionRateSubscription", commission_rate_store as "commissionRateStore",
                       total_clicks as "totalClicks", total_conversions as "totalConversions", total_earnings as "totalEarnings",
                       balance, status, payout_method as "payoutMethod", payout_details as "payoutDetails", created_at as "createdAt"`,
            [method, JSON.stringify(details), userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Affiliate not found');
        }

        return result.rows[0];
    }
}
