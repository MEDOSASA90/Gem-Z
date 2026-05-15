/**
 * GEM Z — Loyalty Program Service
 *
 * Business logic for loyalty points, tier system, and reward redemption.
 * - Points earning via check-ins, purchases, referrals, challenge completions
 * - Tier progression: Bronze → Silver → Gold → Platinum
 * - Reward catalog and redemption with transaction safety
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../../core/errors';

const log = createLogger('loyalty-service');

// ─── Types ──────────────────────────────────────────────────────

export interface LoyaltyTier {
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number | null;
    discountPercent: number;
    freePassesPerMonth: number;
    priorityBooking: boolean;
    color: string;
    icon: string;
}

export interface LoyaltyReward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: 'discount' | 'free_pass' | 'merchandise' | 'priority' | 'experience';
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
    expiresAt: string | null;
}

export interface LoyaltyPoints {
    userId: string;
    totalPoints: number;
    lifetimePoints: number;
    currentTier: string;
    nextTier: string | null;
    pointsToNextTier: number;
    recentTransactions: PointsTransaction[];
}

export interface PointsTransaction {
    id: string;
    userId: string;
    points: number;
    type: 'checkin' | 'purchase' | 'referral' | 'challenge' | 'redemption' | 'bonus';
    description: string;
    referenceId: string | null;
    createdAt: string;
}

export interface RedemptionResult {
    success: boolean;
    rewardName: string;
    pointsDeducted: number;
    remainingPoints: number;
    redemptionId: string;
    message: string;
}

// ─── Tier Definitions ───────────────────────────────────────────

export const TIER_DEFINITIONS: Omit<LoyaltyTier, 'id'>[] = [
    { name: 'Bronze', minPoints: 0, maxPoints: 499, discountPercent: 0, freePassesPerMonth: 0, priorityBooking: false, color: '#CD7F32', icon: 'shield' },
    { name: 'Silver', minPoints: 500, maxPoints: 1999, discountPercent: 5, freePassesPerMonth: 1, priorityBooking: false, color: '#C0C0C0', icon: 'workspace_premium' },
    { name: 'Gold', minPoints: 2000, maxPoints: 4999, discountPercent: 10, freePassesPerMonth: 2, priorityBooking: true, color: '#FFD700', icon: 'emoji_events' },
    { name: 'Platinum', minPoints: 5000, maxPoints: null, discountPercent: 20, freePassesPerMonth: 4, priorityBooking: true, color: '#00B8FF', icon: 'diamond' },
];

// ─── Service ────────────────────────────────────────────────────

export class LoyaltyService {
    constructor(private pool: Pool) {}

    // ─── Tier Management ──────────────────────────────────────

    /**
     * Seed loyalty tiers into the database.
     */
    async seedTiers(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const tier of TIER_DEFINITIONS) {
                await client.query(
                    `INSERT INTO loyalty_tiers (id, name, min_points, max_points, discount_percent, free_passes_per_month, priority_booking, color, icon)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (name) DO NOTHING`,
                    [uuidv4(), tier.name, tier.minPoints, tier.maxPoints, tier.discountPercent, tier.freePassesPerMonth, tier.priorityBooking, tier.color, tier.icon]
                );
            }

            await client.query('COMMIT');
            log.info('Loyalty tiers seeded');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error }, 'Failed to seed loyalty tiers');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all loyalty tiers.
     */
    async getTiers(): Promise<LoyaltyTier[]> {
        await this.seedTiers();
        const result = await this.pool.query(
            `SELECT id, name, min_points as "minPoints", max_points as "maxPoints",
                    discount_percent as "discountPercent", free_passes_per_month as "freePassesPerMonth",
                    priority_booking as "priorityBooking", color, icon
             FROM loyalty_tiers ORDER BY min_points ASC`
        );
        return result.rows;
    }

    /**
     * Get user's current tier info.
     */
    async getUserTier(userId: string): Promise<{ tier: LoyaltyTier; progress: number; pointsToNext: number }> {
        await this.seedTiers();

        const pointsResult = await this.pool.query(
            `SELECT COALESCE(SUM(points), 0) as total FROM loyalty_points WHERE user_id = $1`,
            [userId]
        );
        const totalPoints = parseInt(pointsResult.rows[0]?.total || '0', 10);

        const tiersResult = await this.pool.query(
            `SELECT id, name, min_points as "minPoints", max_points as "maxPoints",
                    discount_percent as "discountPercent", free_passes_per_month as "freePassesPerMonth",
                    priority_booking as "priorityBooking", color, icon
             FROM loyalty_tiers ORDER BY min_points ASC`
        );

        const tiers = tiersResult.rows;
        let currentTier = tiers[0];
        let nextTier = tiers[1] || null;

        for (let i = 0; i < tiers.length; i++) {
            const minPts = parseInt(tiers[i].minPoints, 10);
            const maxPts = tiers[i].maxPoints ? parseInt(tiers[i].maxPoints, 10) : Infinity;
            if (totalPoints >= minPts && totalPoints <= maxPts) {
                currentTier = tiers[i];
                nextTier = tiers[i + 1] || null;
                break;
            }
        }

        let progress = 100;
        let pointsToNext = 0;

        if (nextTier) {
            const nextMin = parseInt(nextTier.minPoints, 10);
            const currentMin = parseInt(currentTier.minPoints, 10);
            const range = nextMin - currentMin;
            const earnedInTier = totalPoints - currentMin;
            progress = Math.min(100, Math.round((earnedInTier / range) * 100));
            pointsToNext = nextMin - totalPoints;
        }

        return { tier: currentTier, progress, pointsToNext };
    }

    // ─── Points Management ────────────────────────────────────

    /**
     * Get user's loyalty points summary.
     */
    async getPoints(userId: string): Promise<LoyaltyPoints> {
        const client = await this.pool.connect();
        try {
            const totalResult = await client.query(
                `SELECT COALESCE(SUM(points), 0) as total FROM loyalty_points WHERE user_id = $1`,
                [userId]
            );
            const totalPoints = parseInt(totalResult.rows[0]?.total || '0', 10);

            const lifetimeResult = await client.query(
                `SELECT COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as lifetime FROM loyalty_points WHERE user_id = $1`,
                [userId]
            );
            const lifetimePoints = parseInt(lifetimeResult.rows[0]?.lifetime || '0', 10);

            const { tier, progress, pointsToNext } = await this.getUserTier(userId);

            const transactionsResult = await client.query(
                `SELECT id, user_id as "userId", points, type, description, reference_id as "referenceId", created_at as "createdAt"
                 FROM loyalty_points WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
                [userId]
            );

            let nextTierName: string | null = null;
            if (pointsToNext > 0) {
                const nextTierResult = await client.query(
                    `SELECT name FROM loyalty_tiers WHERE min_points > $1 ORDER BY min_points ASC LIMIT 1`,
                    [totalPoints]
                );
                nextTierName = nextTierResult.rows[0]?.name || null;
            }

            return {
                userId,
                totalPoints,
                lifetimePoints,
                currentTier: tier.name,
                nextTier: nextTierName,
                pointsToNextTier: Math.max(0, pointsToNext),
                recentTransactions: transactionsResult.rows,
            };
        } finally {
            client.release();
        }
    }

    /**
     * Award points to a user for an activity.
     */
    async awardPoints(
        userId: string,
        points: number,
        type: PointsTransaction['type'],
        description: string,
        referenceId?: string
    ): Promise<PointsTransaction> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO loyalty_points (id, user_id, points, type, description, reference_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, user_id as "userId", points, type, description, reference_id as "referenceId", created_at as "createdAt"`,
                [uuidv4(), userId, points, type, description, referenceId || null]
            );

            await client.query('COMMIT');

            log.info({ userId, points, type }, 'Loyalty points awarded');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, userId }, 'Failed to award loyalty points');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Rewards ──────────────────────────────────────────────

    /**
     * Seed default rewards.
     */
    async seedRewards(): Promise<void> {
        const defaultRewards: Omit<LoyaltyReward, 'id'>[] = [
            { name: '5% Store Discount', description: 'Get 5% off on your next store purchase', pointsCost: 100, category: 'discount', imageUrl: null, stock: 999, isActive: true, expiresAt: null },
            { name: 'Free Gym Pass', description: 'One free day pass to any partner gym', pointsCost: 250, category: 'free_pass', imageUrl: null, stock: 500, isActive: true, expiresAt: null },
            { name: '10% Store Discount', description: 'Get 10% off on your next store purchase', pointsCost: 300, category: 'discount', imageUrl: null, stock: 500, isActive: true, expiresAt: null },
            { name: 'GEM Z Water Bottle', description: 'Exclusive branded water bottle', pointsCost: 500, category: 'merchandise', imageUrl: null, stock: 100, isActive: true, expiresAt: null },
            { name: 'Priority Booking', description: 'Priority access to book PT sessions for 1 week', pointsCost: 400, category: 'priority', imageUrl: null, stock: 200, isActive: true, expiresAt: null },
            { name: 'Free Supplement Sample', description: 'Choose a free supplement sample pack', pointsCost: 150, category: 'merchandise', imageUrl: null, stock: 300, isActive: true, expiresAt: null },
            { name: '20% Store Discount', description: 'Get 20% off on your next store purchase', pointsCost: 750, category: 'discount', imageUrl: null, stock: 200, isActive: true, expiresAt: null },
            { name: 'GEM Z T-Shirt', description: 'Premium branded fitness t-shirt', pointsCost: 1000, category: 'merchandise', imageUrl: null, stock: 50, isActive: true, expiresAt: null },
            { name: 'Free Month Subscription', description: 'One free month of GEM Z Premium', pointsCost: 2000, category: 'experience', imageUrl: null, stock: 20, isActive: true, expiresAt: null },
            { name: 'Personal Training Session', description: 'One complimentary PT session', pointsCost: 1500, category: 'experience', imageUrl: null, stock: 30, isActive: true, expiresAt: null },
        ];

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const reward of defaultRewards) {
                await client.query(
                    `INSERT INTO loyalty_rewards (id, name, description, points_cost, category, image_url, stock, is_active, expires_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (name) DO NOTHING`,
                    [uuidv4(), reward.name, reward.description, reward.pointsCost, reward.category, reward.imageUrl, reward.stock, reward.isActive, reward.expiresAt]
                );
            }

            await client.query('COMMIT');
            log.info('Default loyalty rewards seeded');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error }, 'Failed to seed loyalty rewards');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * List all available rewards.
     */
    async getRewards(category?: string): Promise<LoyaltyReward[]> {
        await this.seedRewards();

        let query = `SELECT id, name, description, points_cost as "pointsCost", category, image_url as "imageUrl",
                            stock, is_active as "isActive", expires_at as "expiresAt"
                     FROM loyalty_rewards WHERE is_active = TRUE AND stock > 0`;
        const params: any[] = [];

        if (category && category !== 'all') {
            query += ` AND category = $1`;
            params.push(category);
        }

        query += ` ORDER BY points_cost ASC`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Redeem a reward.
     */
    async redeemReward(userId: string, rewardId: string): Promise<RedemptionResult> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get reward with lock
            const rewardResult = await client.query(
                `SELECT id, name, points_cost, stock, is_active FROM loyalty_rewards WHERE id = $1 FOR UPDATE`,
                [rewardId]
            );

            if (rewardResult.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Reward not found');
            }

            const reward = rewardResult.rows[0];

            if (!reward.is_active) {
                await client.query('ROLLBACK');
                throw new ValidationError('This reward is no longer active');
            }

            if (reward.stock <= 0) {
                await client.query('ROLLBACK');
                throw new ValidationError('This reward is out of stock');
            }

            // Get user's points with lock
            const pointsResult = await client.query(
                `SELECT COALESCE(SUM(points), 0) as total FROM loyalty_points WHERE user_id = $1`,
                [userId]
            );
            const userPoints = parseInt(pointsResult.rows[0]?.total || '0', 10);

            if (userPoints < reward.points_cost) {
                await client.query('ROLLBACK');
                throw new ValidationError(`Insufficient points. You have ${userPoints}, need ${reward.points_cost}`);
            }

            // Deduct points
            await client.query(
                `INSERT INTO loyalty_points (id, user_id, points, type, description, reference_id)
                 VALUES ($1, $2, $3, 'redemption', $4, $5)`,
                [uuidv4(), userId, -reward.points_cost, `Redeemed: ${reward.name}`, rewardId]
            );

            // Decrement stock
            await client.query(
                `UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = $1`,
                [rewardId]
            );

            // Create redemption record
            const redemptionResult = await client.query(
                `INSERT INTO loyalty_redemptions (id, user_id, reward_id, points_used, status)
                 VALUES ($1, $2, $3, $4, 'completed')
                 RETURNING id`,
                [uuidv4(), userId, rewardId, reward.points_cost]
            );

            await client.query('COMMIT');

            const remainingPoints = userPoints - reward.points_cost;

            log.info({ userId, rewardId, rewardName: reward.name, pointsUsed: reward.points_cost }, 'Reward redeemed');

            return {
                success: true,
                rewardName: reward.name,
                pointsDeducted: reward.points_cost,
                remainingPoints,
                redemptionId: redemptionResult.rows[0].id,
                message: `Successfully redeemed ${reward.name} for ${reward.points_cost} points!`,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get user's redemption history.
     */
    async getRedemptionHistory(userId: string): Promise<any[]> {
        const result = await this.pool.query(
            `SELECT lr.id, lr.points_used as "pointsUsed", lr.status, lr.created_at as "createdAt",
                    r.name as "rewardName", r.description as "rewardDescription", r.category as "rewardCategory"
             FROM loyalty_redemptions lr
             JOIN loyalty_rewards r ON lr.reward_id = r.id
             WHERE lr.user_id = $1
             ORDER BY lr.created_at DESC LIMIT 50`,
            [userId]
        );
        return result.rows;
    }
}
