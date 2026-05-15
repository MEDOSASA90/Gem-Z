/**
 * GEM Z — Gym Pass Service
 *
 * Business logic for multi-gym pass features:
 * - Cross-gym subscription plan management
 * - Pass validation and redemption
 * - Gym network discovery
 * - Pass renewal and expiration handling
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('gympass-service');

// ─── Types ──────────────────────────────────────────────────────

export type PassStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';
export type PassTier = 'basic' | 'premium' | 'elite';

export interface GymPassPlan {
    id: string;
    name: string;
    description: string | null;
    tier: PassTier;
    price: number;
    priceUnit: string;
    durationDays: number;
    maxGyms: number;
    maxVisitsPerMonth: number | null;
    perks: Record<string, any> | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface GymPass {
    id: string;
    userId: string;
    planId: string;
    planName?: string;
    status: PassStatus;
    gymsAccessed: string[];
    visitsUsed: number;
    visitsRemaining: number | null;
    validFrom: Date;
    validUntil: Date;
    autoRenew: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface GymNetworkEntry {
    gymId: string;
    gymName: string;
    branchName: string | null;
    city: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    rating: number | null;
    isActive: boolean;
    amenities: string[];
    images: string[];
    passTiers: PassTier[];
}

export interface PassValidationResult {
    valid: boolean;
    passId: string;
    gymId: string;
    gymName: string;
    message: string;
    visitsRemaining: number | null;
    validUntil: Date;
}

export interface CreatePlanInput {
    name: string;
    description?: string;
    tier: PassTier;
    price: number;
    priceUnit?: string;
    durationDays: number;
    maxGyms: number;
    maxVisitsPerMonth?: number;
    perks?: Record<string, any>;
}

// ─── Service ────────────────────────────────────────────────────

export class GymPassService {
    constructor(private pool: Pool) {}

    // ─── Plan Management ──────────────────────────────────────

    /**
     * Create a new gym pass plan (admin only).
     */
    async createPlan(data: CreatePlanInput): Promise<GymPassPlan> {
        if (!data.name || data.name.trim().length === 0) {
            throw new ValidationError('Plan name is required', ErrorCode.MISSING_FIELD);
        }

        if (!['basic', 'premium', 'elite'].includes(data.tier)) {
            throw new ValidationError(
                'Invalid tier. Must be one of: basic, premium, elite',
                ErrorCode.INVALID_INPUT
            );
        }

        if (data.price < 0) {
            throw new ValidationError('Price cannot be negative', ErrorCode.INVALID_INPUT);
        }

        if (data.durationDays <= 0) {
            throw new ValidationError('Duration must be positive', ErrorCode.INVALID_INPUT);
        }

        const planId = uuidv4();

        try {
            const result = await this.pool.query(
                `
                INSERT INTO gym_pass_plans (
                    id, name, description, tier, price, price_unit,
                    duration_days, max_gyms, max_visits_per_month, perks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING
                    id,
                    name,
                    description,
                    tier,
                    price,
                    price_unit as "priceUnit",
                    duration_days as "durationDays",
                    max_gyms as "maxGyms",
                    max_visits_per_month as "maxVisitsPerMonth",
                    perks,
                    is_active as "isActive",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [
                    planId,
                    data.name.trim(),
                    data.description || null,
                    data.tier,
                    data.price,
                    data.priceUnit || 'EGP',
                    data.durationDays,
                    data.maxGyms,
                    data.maxVisitsPerMonth ?? null,
                    data.perks ? JSON.stringify(data.perks) : null,
                ]
            );

            log.info({ planId, name: data.name, tier: data.tier }, 'Gym pass plan created');
            return result.rows[0];
        } catch (error) {
            log.error({ error, name: data.name }, 'Failed to create gym pass plan');
            throw new AppError('Failed to create gym pass plan', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * List all active gym pass plans.
     */
    async listPlans(tier?: PassTier): Promise<GymPassPlan[]> {
        const conditions = ['is_active = TRUE'];
        const values: any[] = [];
        let paramIdx = 1;

        if (tier) {
            conditions.push(`tier = $${paramIdx}`);
            values.push(tier);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            SELECT
                id,
                name,
                description,
                tier,
                price,
                price_unit as "priceUnit",
                duration_days as "durationDays",
                max_gyms as "maxGyms",
                max_visits_per_month as "maxVisitsPerMonth",
                perks,
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM gym_pass_plans
            WHERE ${conditions.join(' AND ')}
            ORDER BY
                CASE tier
                    WHEN 'elite' THEN 1
                    WHEN 'premium' THEN 2
                    WHEN 'basic' THEN 3
                END,
                price ASC
            `,
            values
        );

        return result.rows;
    }

    // ─── Pass Management ──────────────────────────────────────

    /**
     * Purchase a gym pass.
     */
    async purchasePass(
        userId: string,
        planId: string,
        autoRenew: boolean = false
    ): Promise<GymPass> {
        // Verify plan exists and is active
        const planResult = await this.pool.query(
            `
            SELECT
                id,
                duration_days as "durationDays",
                max_visits_per_month as "maxVisitsPerMonth",
                name
            FROM gym_pass_plans
            WHERE id = $1 AND is_active = TRUE
            `,
            [planId]
        );

        if (planResult.rows.length === 0) {
            throw new NotFoundError('Gym pass plan not found', ErrorCode.NOT_FOUND_PLAN);
        }

        const plan = planResult.rows[0];
        const passId = uuidv4();
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + Number(plan.durationDays));

        try {
            const result = await this.pool.query(
                `
                INSERT INTO gym_passes (
                    id, user_id, plan_id, status,
                    gyms_accessed, visits_used, visits_remaining,
                    valid_from, valid_until, auto_renew
                )
                VALUES ($1, $2, $3, 'active', '[]', 0, $4, $5, $6, $7)
                RETURNING
                    id,
                    user_id as "userId",
                    plan_id as "planId",
                    status,
                    gyms_accessed as "gymsAccessed",
                    visits_used as "visitsUsed",
                    visits_remaining as "visitsRemaining",
                    valid_from as "validFrom",
                    valid_until as "validUntil",
                    auto_renew as "autoRenew",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [
                    passId,
                    userId,
                    planId,
                    plan.maxVisitsPerMonth,
                    validFrom,
                    validUntil,
                    autoRenew,
                ]
            );

            result.rows[0].planName = plan.name;

            log.info({ passId, userId, planId }, 'Gym pass purchased');
            return result.rows[0];
        } catch (error) {
            log.error({ error, userId, planId }, 'Failed to purchase gym pass');
            throw new AppError('Failed to purchase gym pass', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Get user's active passes.
     */
    async getUserPasses(userId: string): Promise<GymPass[]> {
        // Auto-expire passes that are past their valid_until date
        await this.pool.query(
            `
            UPDATE gym_passes
            SET status = 'expired'
            WHERE status = 'active' AND valid_until < NOW()
            `
        );

        const result = await this.pool.query(
            `
            SELECT
                gp.id,
                gp.user_id as "userId",
                gp.plan_id as "planId",
                gpp.name as "planName",
                gp.status,
                gp.gyms_accessed as "gymsAccessed",
                gp.visits_used as "visitsUsed",
                gp.visits_remaining as "visitsRemaining",
                gp.valid_from as "validFrom",
                gp.valid_until as "validUntil",
                gp.auto_renew as "autoRenew",
                gp.created_at as "createdAt",
                gp.updated_at as "updatedAt"
            FROM gym_passes gp
            JOIN gym_pass_plans gpp ON gp.plan_id = gpp.id
            WHERE gp.user_id = $1
            ORDER BY
                CASE gp.status
                    WHEN 'active' THEN 1
                    WHEN 'pending_payment' THEN 2
                    WHEN 'cancelled' THEN 3
                    WHEN 'expired' THEN 4
                END,
                gp.valid_until DESC
            `,
            [userId]
        );

        return result.rows;
    }

    /**
     * Validate a pass for gym entry.
     */
    async validatePass(
        userId: string,
        gymId: string
    ): Promise<PassValidationResult> {
        // Check gym exists and is in network
        const gymResult = await this.pool.query(
            `
            SELECT
                g.id,
                g.name as "gymName",
                g.is_active as "isActive"
            FROM gyms g
            WHERE g.id = $1
            `,
            [gymId]
        );

        if (gymResult.rows.length === 0) {
            throw new NotFoundError('Gym not found', ErrorCode.NOT_FOUND_GYM);
        }

        const gym = gymResult.rows[0];
        if (!gym.isActive) {
            return {
                valid: false,
                passId: '',
                gymId,
                gymName: gym.gymName,
                message: 'This gym is currently inactive',
                visitsRemaining: 0,
                validUntil: new Date(),
            };
        }

        // Find user's active pass that includes this gym
        const passResult = await this.pool.query(
            `
            SELECT
                gp.id,
                gp.plan_id as "planId",
                gp.visits_used as "visitsUsed",
                gp.visits_remaining as "visitsRemaining",
                gp.gyms_accessed as "gymsAccessed",
                gp.valid_until as "validUntil",
                gpp.max_gyms as "maxGyms",
                gpp.name as "planName"
            FROM gym_passes gp
            JOIN gym_pass_plans gpp ON gp.plan_id = gpp.id
            WHERE gp.user_id = $1
              AND gp.status = 'active'
              AND gp.valid_until > NOW()
              AND (
                  $2 = ANY(gp.gyms_accessed)
                  OR CARDINALITY(gp.gyms_accessed) < gpp.max_gyms
              )
            ORDER BY gp.valid_until ASC
            LIMIT 1
            `,
            [userId, gymId]
        );

        if (passResult.rows.length === 0) {
            return {
                valid: false,
                passId: '',
                gymId,
                gymName: gym.gymName,
                message: 'No active pass valid for this gym. Please purchase a gym pass.',
                visitsRemaining: 0,
                validUntil: new Date(),
            };
        }

        const pass = passResult.rows[0];

        // Check visit limit
        if (pass.visitsRemaining !== null && pass.visitsRemaining <= 0) {
            return {
                valid: false,
                passId: pass.id,
                gymId,
                gymName: gym.gymName,
                message: 'Visit limit reached for this billing period',
                visitsRemaining: 0,
                validUntil: pass.validUntil,
            };
        }

        return {
            valid: true,
            passId: pass.id,
            gymId,
            gymName: gym.gymName,
            message: `Pass valid! Plan: ${pass.planName}`,
            visitsRemaining: pass.visitsRemaining,
            validUntil: pass.validUntil,
        };
    }

    /**
     * Redeem a pass visit at a gym.
     */
    async redeemVisit(
        passId: string,
        userId: string,
        gymId: string
    ): Promise<{ visitsRemaining: number | null; message: string }> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify pass ownership and validity
            const passResult = await client.query(
                `
                SELECT
                    gp.*,
                    gpp.max_gyms as "maxGyms",
                    gpp.name as "planName"
                FROM gym_passes gp
                JOIN gym_pass_plans gpp ON gp.plan_id = gpp.id
                WHERE gp.id = $1 AND gp.user_id = $2 AND gp.status = 'active'
                `,
                [passId, userId]
            );

            if (passResult.rows.length === 0) {
                throw new NotFoundError('Active pass not found', ErrorCode.NOT_FOUND_RESOURCE);
            }

            const pass = passResult.rows[0];

            if (new Date(pass.valid_until) < new Date()) {
                throw new ValidationError('Pass has expired', ErrorCode.INVALID_INPUT);
            }

            if (pass.visits_remaining !== null && pass.visits_remaining <= 0) {
                throw new ValidationError('No visits remaining', ErrorCode.INVALID_INPUT);
            }

            // Add gym to accessed list if not already there
            const gymsAccessed: string[] = pass.gyms_accessed || [];
            const gymAlreadyAccessed = gymsAccessed.includes(gymId);

            if (!gymAlreadyAccessed) {
                if (gymsAccessed.length >= pass.maxGyms) {
                    throw new ValidationError(
                        `Maximum gym limit (${pass.maxGyms}) reached for this plan`,
                        ErrorCode.INVALID_INPUT
                    );
                }
                gymsAccessed.push(gymId);
            }

            // Update pass
            await client.query(
                `
                UPDATE gym_passes
                SET
                    visits_used = visits_used + 1,
                    visits_remaining = CASE
                        WHEN visits_remaining IS NOT NULL THEN visits_remaining - 1
                        ELSE NULL
                    END,
                    gyms_accessed = $3,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING visits_remaining as "visitsRemaining"
                `,
                [passId, userId, JSON.stringify(gymsAccessed)]
            );

            // Log the visit
            await client.query(
                `
                INSERT INTO gym_pass_visits (id, pass_id, user_id, gym_id, visited_at)
                VALUES ($1, $2, $3, $4, NOW())
                `,
                [uuidv4(), passId, userId, gymId]
            );

            await client.query('COMMIT');

            const newRemaining =
                pass.visits_remaining !== null ? pass.visits_remaining - 1 : null;

            log.info({ passId, userId, gymId }, 'Gym pass visit redeemed');
            return {
                visitsRemaining: newRemaining,
                message: `Visit recorded! ${newRemaining !== null ? `${newRemaining} visits remaining` : 'Unlimited visits'}`,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            log.error({ error, passId, userId, gymId }, 'Failed to redeem visit');
            throw new AppError('Failed to redeem visit', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * Cancel auto-renew for a pass.
     */
    async cancelAutoRenew(passId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            UPDATE gym_passes
            SET auto_renew = FALSE, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            `,
            [passId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Pass not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ passId, userId }, 'Auto-renew cancelled');
    }

    // ─── Gym Network ──────────────────────────────────────────

    /**
     * Get gym network — all gyms available for multi-gym passes.
     */
    async getGymNetwork(
        city?: string,
        tier?: PassTier
    ): Promise<GymNetworkEntry[]> {
        const conditions = ['g.is_active = TRUE'];
        const values: any[] = [];
        let paramIdx = 1;

        if (city) {
            conditions.push(`LOWER(g.city) = LOWER($${paramIdx})`);
            values.push(city);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            SELECT
                g.id as "gymId",
                g.name as "gymName",
                g.branch_name as "branchName",
                g.city,
                g.address,
                g.latitude,
                g.longitude,
                COALESCE(AVG(gr.rating), 0) as "rating",
                g.is_active as "isActive",
                COALESCE(g.amenities, '[]') as "amenities",
                COALESCE(g.images, '[]') as "images"
            FROM gyms g
            LEFT JOIN gym_reviews gr ON gr.gym_id = g.id
            WHERE ${conditions.join(' AND ')}
            GROUP BY g.id
            ORDER BY g.name ASC
            LIMIT 200
            `,
            values
        );

        return result.rows.map((row: any) => ({
            ...row,
            rating: Math.round(parseFloat(row.rating) * 100) / 100,
            amenities: Array.isArray(row.amenities) ? row.amenities : JSON.parse(row.amenities || '[]'),
            images: Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]'),
            passTiers: ['basic', 'premium', 'elite'],
        }));
    }

    /**
     * Get pass usage history for a user.
     */
    async getPassHistory(userId: string, passId?: string): Promise<
        Array<{
            visitId: string;
            gymId: string;
            gymName: string;
            visitedAt: Date;
        }>
    > {
        const conditions = ['gpv.user_id = $1'];
        const values: any[] = [userId];
        let paramIdx = 2;

        if (passId) {
            conditions.push(`gpv.pass_id = $${paramIdx}`);
            values.push(passId);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            SELECT
                gpv.id as "visitId",
                gpv.gym_id as "gymId",
                g.name as "gymName",
                gpv.visited_at as "visitedAt"
            FROM gym_pass_visits gpv
            JOIN gyms g ON gpv.gym_id = g.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY gpv.visited_at DESC
            LIMIT 100
            `,
            values
        );

        return result.rows;
    }
}
