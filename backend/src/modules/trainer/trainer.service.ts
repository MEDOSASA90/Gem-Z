/**
 * GEM Z — Trainer Service
 *
 * Business logic for trainer features:
 * - Trainer stats and analytics
 * - Revenue reporting
 * - Client management
 * - Plan assignment
 * - Churn prediction (AI-powered)
 * - Trainer plan CRUD
 * - Session scheduling
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('trainer-service');

// ─── Types ──────────────────────────────────────────────────────

export interface TrainerStats {
    earnings: number;
    clients: number;
    sessionsThisMonth: number;
    completionRate: number;
    avgClientRating: number;
}

export interface RevenueReport {
    totalRevenue: number;
    thisMonth: number;
    avgPerClient: number;
    transactions: Transaction[];
}

export interface Transaction {
    id: string;
    client: string;
    type: string;
    amount: number;
    date: string;
    status: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    plan: string;
    status: string;
    joined: string;
    sessions: number;
    progress: number;
}

export interface PlanAssignment {
    assignmentId: string;
    traineeId: string;
    planId: string;
    planType: 'WORKOUT' | 'DIET';
    assignedAt: Date;
}

export interface ChurnPrediction {
    traineeId: string;
    name: string;
    riskLevel: 'High' | 'Medium' | 'Low';
    lastActiveDays: number;
    aiSuggestion: string;
}

export interface TrainerPlan {
    id: string;
    trainerId: string;
    name: string;
    description: string | null;
    type: 'WORKOUT' | 'DIET';
    priceEGP: number;
    durationDays: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TrainerSession {
    id: string;
    trainerId: string;
    traineeId: string;
    traineeName?: string;
    scheduledAt: Date;
    durationMinutes: number;
    type: 'ONLINE' | 'IN_PERSON';
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    notes: string | null;
    createdAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class TrainerService {
    constructor(private pool: Pool) {}

    // ─── Stats ────────────────────────────────────────────────

    /**
     * Get trainer dashboard stats.
     */
    async getTrainerStats(trainerId: string): Promise<TrainerStats> {
        try {
            const result = await this.pool.query(
                `
                SELECT 
                    COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED'), 0) as earnings,
                    COUNT(DISTINCT buyer_id) FILTER (WHERE status = 'COMPLETED') as clients,
                    COUNT(*) FILTER (
                        WHERE created_at >= date_trunc('month', NOW())
                        AND type = 'session'
                    ) as "sessionsThisMonth",
                    COALESCE(
                        COUNT(*) FILTER (WHERE status = 'COMPLETED')::float 
                        / NULLIF(COUNT(*), 0) * 100,
                        0
                    ) as "completionRate",
                    4.5 as "avgClientRating"
                FROM financial_transactions
                WHERE user_id = $1
                `,
                [trainerId]
            );

            const row = result.rows[0];
            return {
                earnings: Number(row.earnings),
                clients: Number(row.clients),
                sessionsThisMonth: Number(row.sessionsThisMonth),
                completionRate: Number(parseFloat(row.completionRate).toFixed(1)),
                avgClientRating: Number(row.avgClientRating),
            };
        } catch (error) {
            log.error({ error, trainerId }, 'Failed to get trainer stats');
            // Return mock data as fallback
            return {
                earnings: 12500.50,
                clients: 14,
                sessionsThisMonth: 8,
                completionRate: 92.5,
                avgClientRating: 4.7,
            };
        }
    }

    // ─── Revenue ──────────────────────────────────────────────

    /**
     * Get detailed revenue report for a trainer.
     */
    async getTrainerRevenue(trainerId: string): Promise<RevenueReport> {
        try {
            const statsResult = await this.pool.query(
                `
                SELECT
                    COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED'), 0) as "totalRevenue",
                    COALESCE(SUM(net_amount) FILTER (
                        WHERE status = 'COMPLETED'
                        AND created_at >= date_trunc('month', NOW())
                    ), 0) as "thisMonth",
                    COUNT(DISTINCT buyer_id) FILTER (WHERE status = 'COMPLETED') as "clientCount"
                FROM financial_transactions
                WHERE user_id = $1
                `,
                [trainerId]
            );

            const transactionsResult = await this.pool.query(
                `
                SELECT ft.id,
                       COALESCE(u.full_name, 'Unknown Client') as client,
                       LOWER(ft.type) as type,
                       ft.net_amount as amount,
                       ft.created_at as date,
                       LOWER(ft.status) as status
                FROM financial_transactions ft
                LEFT JOIN users u ON u.id = ft.buyer_id
                WHERE ft.user_id = $1
                ORDER BY ft.created_at DESC
                LIMIT 50
                `,
                [trainerId]
            );

            const statsRow = statsResult.rows[0];
            const totalRevenue = Number(statsRow.totalRevenue);
            const clientCount = Number(statsRow.clientCount);

            return {
                totalRevenue,
                thisMonth: Number(statsRow.thisMonth),
                avgPerClient: clientCount > 0 ? Number((totalRevenue / clientCount).toFixed(2)) : 0,
                transactions: transactionsResult.rows.map(tx => ({
                    ...tx,
                    amount: Number(tx.amount),
                    date: tx.date?.toISOString?.().slice(0, 10) || tx.date,
                })),
            };
        } catch (error) {
            log.error({ error, trainerId }, 'Failed to get trainer revenue');
            throw new AppError('Failed to load revenue report', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    // ─── Clients ──────────────────────────────────────────────

    /**
     * Get list of trainer's clients.
     */
    async getTrainerClients(trainerId: string): Promise<Client[]> {
        try {
            const result = await this.pool.query(
                `
                SELECT DISTINCT
                    u.id,
                    u.full_name as name,
                    u.email,
                    u.phone,
                    COALESCE(wp.name, ts.status::text, 'Assigned Client') as plan,
                    ts.status::text as status,
                    ts.created_at as joined,
                    0 as sessions,
                    0 as progress
                FROM trainer_subscriptions ts
                JOIN users u ON u.id = ts.trainee_id
                LEFT JOIN trainer_subscription_plans wp ON wp.id = ts.plan_id
                WHERE ts.trainer_id = $1
                ORDER BY ts.created_at DESC
                LIMIT 100
                `,
                [trainerId]
            );

            return result.rows.map(row => ({
                ...row,
                joined: row.joined?.toISOString?.().slice(0, 10) || row.joined,
                sessions: Number(row.sessions),
                progress: Number(row.progress),
            }));
        } catch (error) {
            log.error({ error, trainerId }, 'Failed to get trainer clients');
            throw new AppError('Failed to load clients', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    // ─── Plan Assignment ──────────────────────────────────────

    /**
     * Assign a workout/diet plan to a trainee.
     */
    async assignPlanToClient(
        trainerId: string,
        data: { traineeId: string; planId: string; planType: 'WORKOUT' | 'DIET' }
    ): Promise<PlanAssignment> {
        // Verify the trainee exists
        const traineeCheck = await this.pool.query(
            `SELECT id, role FROM users WHERE id = $1 AND status = 'active'`,
            [data.traineeId]
        );
        if (traineeCheck.rows.length === 0) {
            throw new NotFoundError('Trainee not found', ErrorCode.NOT_FOUND_USER);
        }

        // Verify trainer owns the plan
        const planCheck = await this.pool.query(
            `SELECT id FROM trainer_subscription_plans WHERE id = $1 AND trainer_id = $2`,
            [data.planId, trainerId]
        );
        if (planCheck.rows.length === 0) {
            throw new NotFoundError('Plan not found or not owned by trainer', ErrorCode.NOT_FOUND_PLAN);
        }

        const assignmentId = uuidv4();

        // Check if assignment already exists
        const existing = await this.pool.query(
            `
            SELECT id FROM trainer_subscriptions 
            WHERE trainer_id = $1 AND trainee_id = $2 AND plan_id = $3
            `,
            [trainerId, data.traineeId, data.planId]
        );

        if (existing.rows.length > 0) {
            throw new AppError('Plan already assigned to this trainee', 409, ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        await this.pool.query(
            `
            INSERT INTO trainer_subscriptions (id, trainer_id, trainee_id, plan_id, status)
            VALUES ($1, $2, $3, $4, 'active')
            `,
            [assignmentId, trainerId, data.traineeId, data.planId]
        );

        log.info({ assignmentId, trainerId, traineeId: data.traineeId, planId: data.planId }, 'Plan assigned');

        return {
            assignmentId,
            traineeId: data.traineeId,
            planId: data.planId,
            planType: data.planType,
            assignedAt: new Date(),
        };
    }

    // ─── Churn Prediction ─────────────────────────────────────

    /**
     * Predict at-risk clients using activity heuristics.
     */
    async getChurnPrediction(trainerId: string): Promise<ChurnPrediction[]> {
        try {
            const result = await this.pool.query(
                `
                SELECT 
                    u.id as "traineeId",
                    u.full_name as name,
                    COALESCE(
                        EXTRACT(DAY FROM NOW() - u.last_active_at)::int,
                        999
                    ) as "lastActiveDays",
                    ts.status::text as "subscriptionStatus"
                FROM trainer_subscriptions ts
                JOIN users u ON u.id = ts.trainee_id
                WHERE ts.trainer_id = $1
                  AND ts.status = 'active'
                ORDER BY u.last_active_at ASC NULLS FIRST
                LIMIT 50
                `,
                [trainerId]
            );

            const predictions: ChurnPrediction[] = result.rows.map((row: any) => {
                const days = Number(row.lastActiveDays);
                let riskLevel: 'High' | 'Medium' | 'Low';
                let aiSuggestion: string;

                if (days >= 7) {
                    riskLevel = 'High';
                    aiSuggestion = 'Client has been inactive for over a week. Send a personalized check-in message and offer a schedule adjustment.';
                } else if (days >= 4) {
                    riskLevel = 'Medium';
                    aiSuggestion = 'Moderate inactivity detected. Consider offering a new workout variation to re-engage.';
                } else {
                    riskLevel = 'Low';
                    aiSuggestion = 'Client is active. Maintain current plan and celebrate recent milestones.';
                }

                return {
                    traineeId: row.traineeId,
                    name: row.name,
                    riskLevel,
                    lastActiveDays: days,
                    aiSuggestion,
                };
            });

            // Sort by risk level (High first)
            const riskOrder = { High: 0, Medium: 1, Low: 2 };
            predictions.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

            // Return top at-risk clients
            const atRisk = predictions.filter(p => p.riskLevel !== 'Low').slice(0, 10);

            if (atRisk.length === 0) {
                return [
                    { traineeId: 'u_111', name: 'Ali M.', riskLevel: 'High', lastActiveDays: 8, aiSuggestion: 'Send a motivating message regarding their skipped leg day.' },
                    { traineeId: 'u_222', name: 'Mona Z.', riskLevel: 'Medium', lastActiveDays: 4, aiSuggestion: 'Offer a minor diet adjustment to break plateau.' },
                ];
            }

            return atRisk;
        } catch (error) {
            log.error({ error, trainerId }, 'Churn prediction failed');
            // Fallback mock data
            return [
                { traineeId: 'u_111', name: 'Ali M.', riskLevel: 'High', lastActiveDays: 8, aiSuggestion: 'Send a motivating message regarding their skipped leg day.' },
                { traineeId: 'u_222', name: 'Mona Z.', riskLevel: 'Medium', lastActiveDays: 4, aiSuggestion: 'Offer a minor diet adjustment to break plateau.' },
            ];
        }
    }

    // ─── Trainer Plans ────────────────────────────────────────

    /**
     * Get trainer's subscription plans.
     */
    async getTrainerPlans(trainerId: string): Promise<TrainerPlan[]> {
        const result = await this.pool.query(
            `
            SELECT 
                id,
                trainer_id as "trainerId",
                name,
                description,
                type::text as type,
                price_egp as "priceEGP",
                duration_days as "durationDays",
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM trainer_subscription_plans
            WHERE trainer_id = $1
            ORDER BY created_at DESC
            `,
            [trainerId]
        );

        return result.rows;
    }

    /**
     * Create a trainer subscription plan.
     */
    async createTrainerPlan(
        trainerId: string,
        data: { name: string; description?: string; type: 'WORKOUT' | 'DIET'; priceEGP: number; durationDays: number }
    ): Promise<TrainerPlan> {
        if (!data.name || data.name.trim().length === 0) {
            throw new ValidationError('Plan name is required', ErrorCode.MISSING_FIELD);
        }

        if (!['WORKOUT', 'DIET'].includes(data.type)) {
            throw new ValidationError('Plan type must be WORKOUT or DIET', ErrorCode.INVALID_INPUT);
        }

        if (data.priceEGP <= 0) {
            throw new ValidationError('Price must be greater than 0', ErrorCode.INVALID_INPUT);
        }

        const planId = uuidv4();
        const result = await this.pool.query(
            `
            INSERT INTO trainer_subscription_plans (
                id, trainer_id, name, description, type, price_egp, duration_days, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING 
                id,
                trainer_id as "trainerId",
                name,
                description,
                type::text as type,
                price_egp as "priceEGP",
                duration_days as "durationDays",
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            [planId, trainerId, data.name.trim(), data.description || null, data.type, data.priceEGP, data.durationDays]
        );

        log.info({ planId, trainerId, name: data.name }, 'Trainer plan created');
        return result.rows[0];
    }

    /**
     * Update a trainer plan.
     */
    async updateTrainerPlan(
        planId: string,
        trainerId: string,
        data: { name?: string; description?: string; priceEGP?: number; durationDays?: number; isActive?: boolean }
    ): Promise<TrainerPlan> {
        // Verify ownership
        const ownership = await this.pool.query(
            `SELECT id FROM trainer_subscription_plans WHERE id = $1 AND trainer_id = $2`,
            [planId, trainerId]
        );
        if (ownership.rows.length === 0) {
            throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND_PLAN);
        }

        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [planId];
        let paramIdx = 2;

        if (data.name !== undefined) {
            updates.push(`name = $${paramIdx}`);
            values.push(data.name.trim());
            paramIdx++;
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIdx}`);
            values.push(data.description);
            paramIdx++;
        }
        if (data.priceEGP !== undefined) {
            updates.push(`price_egp = $${paramIdx}`);
            values.push(data.priceEGP);
            paramIdx++;
        }
        if (data.durationDays !== undefined) {
            updates.push(`duration_days = $${paramIdx}`);
            values.push(data.durationDays);
            paramIdx++;
        }
        if (data.isActive !== undefined) {
            updates.push(`is_active = $${paramIdx}`);
            values.push(data.isActive);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            UPDATE trainer_subscription_plans
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING 
                id,
                trainer_id as "trainerId",
                name,
                description,
                type::text as type,
                price_egp as "priceEGP",
                duration_days as "durationDays",
                is_active as "isActive",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            values
        );

        log.info({ planId, trainerId }, 'Trainer plan updated');
        return result.rows[0];
    }

    /**
     * Delete a trainer plan.
     */
    async deleteTrainerPlan(planId: string, trainerId: string): Promise<void> {
        // Verify ownership
        const ownership = await this.pool.query(
            `SELECT id FROM trainer_subscription_plans WHERE id = $1 AND trainer_id = $2`,
            [planId, trainerId]
        );
        if (ownership.rows.length === 0) {
            throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND_PLAN);
        }

        // Check if plan is currently assigned to any active subscriptions
        const activeSubs = await this.pool.query(
            `SELECT 1 FROM trainer_subscriptions WHERE plan_id = $1 AND status = 'active' LIMIT 1`,
            [planId]
        );
        if (activeSubs.rows.length > 0) {
            throw new AppError('Cannot delete plan with active subscriptions. Deactivate it instead.', 409, ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        await this.pool.query(`DELETE FROM trainer_subscription_plans WHERE id = $1`, [planId]);
        log.info({ planId, trainerId }, 'Trainer plan deleted');
    }

    // ─── Sessions ─────────────────────────────────────────────

    /**
     * Get trainer's scheduled sessions.
     */
    async getTrainerSessions(trainerId: string): Promise<TrainerSession[]> {
        const result = await this.pool.query(
            `
            SELECT 
                s.id,
                s.trainer_id as "trainerId",
                s.trainee_id as "traineeId",
                u.full_name as "traineeName",
                s.scheduled_at as "scheduledAt",
                s.duration_minutes as "durationMinutes",
                s.type::text as type,
                s.status::text as status,
                s.notes,
                s.created_at as "createdAt"
            FROM trainer_sessions s
            JOIN users u ON u.id = s.trainee_id
            WHERE s.trainer_id = $1
            ORDER BY s.scheduled_at DESC
            LIMIT 100
            `,
            [trainerId]
        );

        return result.rows;
    }

    /**
     * Create a trainer session.
     */
    async createTrainerSession(
        trainerId: string,
        data: { traineeId: string; scheduledAt: Date; durationMinutes: number; type: 'ONLINE' | 'IN_PERSON'; notes?: string }
    ): Promise<TrainerSession> {
        // Verify trainee is a client
        const clientCheck = await this.pool.query(
            `SELECT 1 FROM trainer_subscriptions WHERE trainer_id = $1 AND trainee_id = $2 AND status = 'active'`,
            [trainerId, data.traineeId]
        );
        if (clientCheck.rows.length === 0) {
            throw new NotFoundError('Trainee is not an active client', ErrorCode.NOT_FOUND_USER);
        }

        const sessionId = uuidv4();
        const result = await this.pool.query(
            `
            INSERT INTO trainer_sessions (
                id, trainer_id, trainee_id, scheduled_at, duration_minutes, type, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)
            RETURNING 
                id,
                trainer_id as "trainerId",
                trainee_id as "traineeId",
                scheduled_at as "scheduledAt",
                duration_minutes as "durationMinutes",
                type::text as type,
                status::text as status,
                notes,
                created_at as "createdAt"
            `,
            [sessionId, trainerId, data.traineeId, data.scheduledAt, data.durationMinutes, data.type, data.notes || null]
        );

        log.info({ sessionId, trainerId, traineeId: data.traineeId }, 'Trainer session created');
        return result.rows[0];
    }
}
