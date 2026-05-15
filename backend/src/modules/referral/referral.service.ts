/**
 * GEM Z — Referral Service
 *
 * Business logic for referral features:
 * - Generate unique referral codes for users
 * - Track referral chain (who referred whom)
 * - Reward coins for successful referrals
 * - Provide referral statistics and leaderboard
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';

const log = createLogger('referral-service');

// ─── Types ──────────────────────────────────────────────────────

export interface Referral {
    id: string;
    referrerId: string;
    referredId: string;
    referralCode: string;
    status: 'pending' | 'completed' | 'rewarded';
    rewardAmount: number;
    rewardUnit: string;
    createdAt: Date;
    completedAt: Date | null;
}

export interface ReferralCode {
    userId: string;
    code: string;
    totalReferrals: number;
    totalRewards: number;
    createdAt: Date;
}

export interface ReferralStats {
    userId: string;
    referralCode: string;
    totalReferrals: number;
    totalRewards: number;
    pendingReferrals: number;
    completedReferrals: number;
    rewardUnit: string;
    referralLink: string;
}

export interface ReferralLeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    totalReferrals: number;
    totalRewards: number;
}

// ─── Service ────────────────────────────────────────────────────

export class ReferralService {
    constructor(private pool: Pool) {}

    // ─── Referral Code Management ─────────────────────────────

    /**
     * Generate or retrieve a referral code for a user.
     */
    async getOrCreateReferralCode(userId: string): Promise<ReferralCode> {
        // Check if user already has a code
        const existing = await this.pool.query(
            `
            SELECT
                user_id as "userId",
                code,
                total_referrals as "totalReferrals",
                total_rewards as "totalRewards",
                created_at as "createdAt"
            FROM referral_codes
            WHERE user_id = $1
            `,
            [userId]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Generate unique code from user info
        const code = await this.generateUniqueCode(userId);

        try {
            const result = await this.pool.query(
                `
                INSERT INTO referral_codes (user_id, code, total_referrals, total_rewards)
                VALUES ($1, $2, 0, 0)
                RETURNING
                    user_id as "userId",
                    code,
                    total_referrals as "totalReferrals",
                    total_rewards as "totalRewards",
                    created_at as "createdAt"
                `,
                [userId, code]
            );

            log.info({ userId, code }, 'Referral code created');
            return result.rows[0];
        } catch (error: any) {
            // Handle unique constraint violation
            if (error.code === '23505') {
                const retry = await this.pool.query(
                    `
                    SELECT
                        user_id as "userId",
                        code,
                        total_referrals as "totalReferrals",
                        total_rewards as "totalRewards",
                        created_at as "createdAt"
                    FROM referral_codes
                    WHERE user_id = $1
                    `,
                    [userId]
                );
                return retry.rows[0];
            }
            throw new AppError('Failed to create referral code', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Process a referral when a new user signs up with a referral code.
     */
    async processReferral(referredId: string, code: string): Promise<void> {
        if (!code || code.trim().length === 0) {
            throw new ValidationError('Referral code is required', ErrorCode.MISSING_FIELD);
        }

        // Find referrer by code
        const referrerResult = await this.pool.query(
            `SELECT user_id FROM referral_codes WHERE code = $1`,
            [code.trim().toUpperCase()]
        );

        if (referrerResult.rows.length === 0) {
            throw new NotFoundError('Invalid referral code', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const referrerId = referrerResult.rows[0].user_id;

        // Prevent self-referral
        if (referrerId === referredId) {
            throw new ValidationError('Cannot refer yourself', ErrorCode.INVALID_INPUT);
        }

        // Check for circular referral (referred user can't be the referrer of referrer)
        const circularCheck = await this.pool.query(
            `SELECT 1 FROM referrals WHERE referred_id = $1 AND referrer_id = $2`,
            [referrerId, referredId]
        );
        if (circularCheck.rows.length > 0) {
            throw new ValidationError('Circular referral not allowed', ErrorCode.INVALID_INPUT);
        }

        // Check if referred user was already referred
        const existingReferral = await this.pool.query(
            `SELECT 1 FROM referrals WHERE referred_id = $1`,
            [referredId]
        );
        if (existingReferral.rows.length > 0) {
            throw new ConflictError(
                'User has already been referred by someone else',
                ErrorCode.CONFLICT_DUPLICATE_RESOURCE
            );
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Create referral record
            const rewardAmount = Number(config.referralRewardAmount) || 100;
            const rewardUnit = config.referralRewardUnit || 'coins';

            await client.query(
                `
                INSERT INTO referrals (
                    id, referrer_id, referred_id, referral_code,
                    status, reward_amount, reward_unit
                )
                VALUES ($1, $2, $3, $4, 'pending', $5, $6)
                `,
                [uuidv4(), referrerId, referredId, code.trim().toUpperCase(), rewardAmount, rewardUnit]
            );

            await client.query('COMMIT');

            log.info({ referrerId, referredId, code }, 'Referral processed');
        } catch (error: any) {
            await client.query('ROLLBACK');
            if (error.code === '23505') {
                throw new ConflictError(
                    'Referral already exists',
                    ErrorCode.CONFLICT_DUPLICATE_RESOURCE
                );
            }
            log.error({ error, referrerId, referredId }, 'Failed to process referral');
            throw new AppError('Failed to process referral', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * Mark a referral as completed and reward the referrer.
     * Called when the referred user completes onboarding or their first workout.
     */
    async completeReferral(referredId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Find pending referral for this user
            const referralResult = await client.query(
                `
                SELECT
                    id,
                    referrer_id,
                    reward_amount,
                    reward_unit,
                    status
                FROM referrals
                WHERE referred_id = $1 AND status = 'pending'
                `,
                [referredId]
            );

            if (referralResult.rows.length === 0) {
                await client.query('COMMIT');
                return; // No pending referral — nothing to do
            }

            const referral = referralResult.rows[0];
            const { id: referralId, referrer_id: referrerId } = referral;
            const rewardAmount = Number(referral.reward_amount);

            // Update referral status
            await client.query(
                `
                UPDATE referrals
                SET status = 'completed', completed_at = NOW()
                WHERE id = $1
                `,
                [referralId]
            );

            // Reward the referrer — add to wallet or coins
            await client.query(
                `
                UPDATE referral_codes
                SET total_referrals = total_referrals + 1,
                    total_rewards = total_rewards + $2
                WHERE user_id = $1
                `,
                [referrerId, rewardAmount]
            );

            // Add coins to referrer's trainee profile
            await client.query(
                `
                UPDATE trainee_profiles
                SET coins_balance = COALESCE(coins_balance, 0) + $2,
                    total_coins_earned = COALESCE(total_coins_earned, 0) + $2
                WHERE user_id = $1
                `,
                [referrerId, rewardAmount]
            );

            await client.query('COMMIT');

            log.info(
                { referralId, referrerId, referredId, rewardAmount },
                'Referral completed and rewarded'
            );
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, referredId }, 'Failed to complete referral');
            throw new AppError('Failed to complete referral', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Stats & Queries ──────────────────────────────────────

    /**
     * Get referral statistics for a user.
     */
    async getReferralStats(userId: string): Promise<ReferralStats> {
        const codeResult = await this.pool.query(
            `
            SELECT code FROM referral_codes WHERE user_id = $1
            `,
            [userId]
        );

        const referralCode = codeResult.rows.length > 0 ? codeResult.rows[0].code : null;

        const statsResult = await this.pool.query(
            `
            SELECT
                COALESCE(SUM(CASE WHEN status IN ('completed', 'rewarded') THEN 1 ELSE 0 END), 0) as "completedReferrals",
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as "pendingReferrals",
                COALESCE(SUM(CASE WHEN status IN ('completed', 'rewarded') THEN reward_amount ELSE 0 END), 0) as "totalRewards",
                MAX(reward_unit) as "rewardUnit"
            FROM referrals
            WHERE referrer_id = $1
            `,
            [userId]
        );

        const stats = statsResult.rows[0];

        return {
            userId,
            referralCode: referralCode || '',
            totalReferrals:
                Number(stats.completedReferrals) + Number(stats.pendingReferrals),
            totalRewards: Number(stats.totalRewards),
            pendingReferrals: Number(stats.pendingReferrals),
            completedReferrals: Number(stats.completedReferrals),
            rewardUnit: stats.rewardUnit || 'coins',
            referralLink: referralCode
                ? `${config.clientUrl}/register?ref=${referralCode}`
                : '',
        };
    }

    /**
     * Get list of users referred by a user.
     */
    async getReferredUsers(userId: string): Promise<
        Array<{
            id: string;
            referredName: string;
            referredAvatar: string | null;
            status: string;
            rewardAmount: number;
            createdAt: Date;
            completedAt: Date | null;
        }>
    > {
        const result = await this.pool.query(
            `
            SELECT
                r.id,
                u.full_name as "referredName",
                u.avatar_url as "referredAvatar",
                r.status,
                r.reward_amount as "rewardAmount",
                r.created_at as "createdAt",
                r.completed_at as "completedAt"
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            WHERE r.referrer_id = $1
            ORDER BY r.created_at DESC
            `,
            [userId]
        );

        return result.rows;
    }

    /**
     * Get global referral leaderboard.
     */
    async getLeaderboard(
        limit: number = 20
    ): Promise<ReferralLeaderboardEntry[]> {
        const result = await this.pool.query(
            `
            SELECT
                rc.user_id as "userId",
                u.full_name as "userName",
                u.avatar_url as "userAvatar",
                rc.total_referrals as "totalReferrals",
                rc.total_rewards as "totalRewards",
                RANK() OVER (ORDER BY rc.total_referrals DESC, rc.total_rewards DESC) as rank
            FROM referral_codes rc
            JOIN users u ON rc.user_id = u.id
            WHERE rc.total_referrals > 0
            ORDER BY rc.total_referrals DESC, rc.total_rewards DESC
            LIMIT $1
            `,
            [limit]
        );

        return result.rows.map((row: any) => ({
            rank: Number(row.rank),
            userId: row.userId,
            userName: row.userName,
            userAvatar: row.userAvatar,
            totalReferrals: Number(row.totalReferrals),
            totalRewards: Number(row.totalRewards),
        }));
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Generate a unique referral code for a user.
     */
    private async generateUniqueCode(userId: string): Promise<string> {
        // Try to create a friendly code from the user's name or fallback to random
        const userResult = await this.pool.query(
            `SELECT full_name FROM users WHERE id = $1`,
            [userId]
        );

        const fullName = userResult.rows[0]?.full_name || '';
        const baseCode = fullName
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .replace(/[^A-Z]/g, '');

        // Generate code: base + random suffix
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        let code = `${baseCode}${suffix}`;

        // Ensure uniqueness
        let attempts = 0;
        while (attempts < 5) {
            const existing = await this.pool.query(
                `SELECT 1 FROM referral_codes WHERE code = $1`,
                [code]
            );
            if (existing.rows.length === 0) break;

            const newSuffix = Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();
            code = `${baseCode}${newSuffix}`;
            attempts++;
        }

        return code;
    }
}
