/**
 * GEM Z — Sleep Tracking Service
 *
 * Business logic for sleep tracking:
 * - Log sleep entries with quality scoring
 * - Calculate sleep trends and statistics
 * - Sleep quality assessment
 * - Weekly/monthly sleep analytics
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('sleep-service');

// ─── Types ──────────────────────────────────────────────────────

export interface SleepLog {
    id: string;
    userId: string;
    bedTime: Date;
    wakeTime: Date;
    durationMinutes: number;
    quality: number; // 1-10
    deepSleepMinutes: number;
    lightSleepMinutes: number;
    remSleepMinutes: number;
    awakeMinutes: number;
    factors: string[]; // e.g., ['caffeine', 'stress', 'exercise']
    notes: string | null;
    createdAt: Date;
}

export interface SleepStats {
    avgDuration: number;
    avgQuality: number;
    avgDeepSleep: number;
    avgRemSleep: number;
    totalEntries: number;
    bestNight: SleepLog | null;
    worstNight: SleepLog | null;
    consistencyScore: number; // 0-100
    trend: 'improving' | 'declining' | 'stable';
}

export interface SleepTrend {
    date: string;
    durationMinutes: number;
    quality: number;
    deepSleepMinutes: number;
}

// ─── Service ────────────────────────────────────────────────────

export class SleepService {
    constructor(private pool: Pool) {}

    // ─── Sleep Log CRUD ───────────────────────────────────────

    /**
     * Log a sleep entry.
     */
    async logSleep(
        userId: string,
        data: {
            bedTime: Date;
            wakeTime: Date;
            quality?: number;
            deepSleepMinutes?: number;
            lightSleepMinutes?: number;
            remSleepMinutes?: number;
            awakeMinutes?: number;
            factors?: string[];
            notes?: string;
        }
    ): Promise<SleepLog> {
        const bedTime = new Date(data.bedTime);
        const wakeTime = new Date(data.wakeTime);

        if (bedTime >= wakeTime) {
            throw new ValidationError(
                'Wake time must be after bed time',
                ErrorCode.INVALID_INPUT
            );
        }

        const durationMinutes = Math.round((wakeTime.getTime() - bedTime.getTime()) / 60000);

        if (durationMinutes < 30) {
            throw new ValidationError(
                'Sleep duration must be at least 30 minutes',
                ErrorCode.INVALID_INPUT
            );
        }

        if (durationMinutes > 20 * 60) {
            throw new ValidationError(
                'Sleep duration cannot exceed 20 hours',
                ErrorCode.INVALID_INPUT
            );
        }

        // Auto-calculate quality if not provided
        const quality = data.quality ?? this.calculateSleepQuality(durationMinutes, data.factors || []);
        if (quality < 1 || quality > 10) {
            throw new ValidationError(
                'Sleep quality must be between 1 and 10',
                ErrorCode.INVALID_INPUT
            );
        }

        const logId = uuidv4();
        const deepSleepMinutes = data.deepSleepMinutes ?? Math.round(durationMinutes * 0.2);
        const lightSleepMinutes = data.lightSleepMinutes ?? Math.round(durationMinutes * 0.5);
        const remSleepMinutes = data.remSleepMinutes ?? Math.round(durationMinutes * 0.25);
        const awakeMinutes = data.awakeMinutes ?? Math.round(durationMinutes * 0.05);

        try {
            const result = await this.pool.query(
                `
                INSERT INTO sleep_logs (
                    id, user_id, bed_time, wake_time, duration_minutes,
                    quality, deep_sleep_minutes, light_sleep_minutes,
                    rem_sleep_minutes, awake_minutes, factors, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING
                    id,
                    user_id as "userId",
                    bed_time as "bedTime",
                    wake_time as "wakeTime",
                    duration_minutes as "durationMinutes",
                    quality,
                    deep_sleep_minutes as "deepSleepMinutes",
                    light_sleep_minutes as "lightSleepMinutes",
                    rem_sleep_minutes as "remSleepMinutes",
                    awake_minutes as "awakeMinutes",
                    factors,
                    notes,
                    created_at as "createdAt"
                `,
                [
                    logId,
                    userId,
                    bedTime,
                    wakeTime,
                    durationMinutes,
                    quality,
                    deepSleepMinutes,
                    lightSleepMinutes,
                    remSleepMinutes,
                    awakeMinutes,
                    data.factors || [],
                    data.notes || null,
                ]
            );

            log.info(
                { logId, userId, durationMinutes, quality },
                'Sleep logged'
            );

            return result.rows[0];
        } catch (error) {
            log.error({ error, userId }, 'Failed to log sleep');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to log sleep', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Get a single sleep log by ID.
     */
    async getSleepLog(logId: string, userId: string): Promise<SleepLog> {
        const result = await this.pool.query(
            `
            SELECT
                id,
                user_id as "userId",
                bed_time as "bedTime",
                wake_time as "wakeTime",
                duration_minutes as "durationMinutes",
                quality,
                deep_sleep_minutes as "deepSleepMinutes",
                light_sleep_minutes as "lightSleepMinutes",
                rem_sleep_minutes as "remSleepMinutes",
                awake_minutes as "awakeMinutes",
                factors,
                notes,
                created_at as "createdAt"
            FROM sleep_logs
            WHERE id = $1 AND user_id = $2
            `,
            [logId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Sleep log not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        return result.rows[0];
    }

    /**
     * List sleep logs for a user with optional date range.
     */
    async listSleepLogs(
        userId: string,
        options?: { startDate?: Date; endDate?: Date; limit?: number; offset?: number }
    ): Promise<{ logs: SleepLog[]; total: number }> {
        const { startDate, endDate, limit = 30, offset = 0 } = options || {};

        let whereClause = 'WHERE user_id = $1';
        const params: any[] = [userId];
        let paramIdx = 2;

        if (startDate) {
            whereClause += ` AND bed_time >= $${paramIdx}`;
            params.push(startDate);
            paramIdx++;
        }

        if (endDate) {
            whereClause += ` AND bed_time <= $${paramIdx}`;
            params.push(endDate);
            paramIdx++;
        }

        const [logsResult, countResult] = await Promise.all([
            this.pool.query(
                `
                SELECT
                    id,
                    user_id as "userId",
                    bed_time as "bedTime",
                    wake_time as "wakeTime",
                    duration_minutes as "durationMinutes",
                    quality,
                    deep_sleep_minutes as "deepSleepMinutes",
                    light_sleep_minutes as "lightSleepMinutes",
                    rem_sleep_minutes as "remSleepMinutes",
                    awake_minutes as "awakeMinutes",
                    factors,
                    notes,
                    created_at as "createdAt"
                FROM sleep_logs
                ${whereClause}
                ORDER BY bed_time DESC
                LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
                `,
                [...params, limit, offset]
            ),
            this.pool.query(
                `SELECT COUNT(*) as total FROM sleep_logs ${whereClause}`,
                params
            ),
        ]);

        return {
            logs: logsResult.rows,
            total: parseInt(countResult.rows[0].total, 10),
        };
    }

    /**
     * Update a sleep log.
     */
    async updateSleepLog(
        logId: string,
        userId: string,
        data: {
            bedTime?: Date;
            wakeTime?: Date;
            quality?: number;
            deepSleepMinutes?: number;
            lightSleepMinutes?: number;
            remSleepMinutes?: number;
            awakeMinutes?: number;
            factors?: string[];
            notes?: string;
        }
    ): Promise<SleepLog> {
        const existing = await this.getSleepLog(logId, userId);

        const bedTime = data.bedTime ? new Date(data.bedTime) : existing.bedTime;
        const wakeTime = data.wakeTime ? new Date(data.wakeTime) : existing.wakeTime;

        if (bedTime >= wakeTime) {
            throw new ValidationError(
                'Wake time must be after bed time',
                ErrorCode.INVALID_INPUT
            );
        }

        const durationMinutes = Math.round((wakeTime.getTime() - bedTime.getTime()) / 60000);

        if (data.quality !== undefined && (data.quality < 1 || data.quality > 10)) {
            throw new ValidationError(
                'Sleep quality must be between 1 and 10',
                ErrorCode.INVALID_INPUT
            );
        }

        const result = await this.pool.query(
            `
            UPDATE sleep_logs
            SET
                bed_time = $3,
                wake_time = $4,
                duration_minutes = $5,
                quality = COALESCE($6, quality),
                deep_sleep_minutes = COALESCE($7, deep_sleep_minutes),
                light_sleep_minutes = COALESCE($8, light_sleep_minutes),
                rem_sleep_minutes = COALESCE($9, rem_sleep_minutes),
                awake_minutes = COALESCE($10, awake_minutes),
                factors = COALESCE($11, factors),
                notes = COALESCE($12, notes)
            WHERE id = $1 AND user_id = $2
            RETURNING
                id,
                user_id as "userId",
                bed_time as "bedTime",
                wake_time as "wakeTime",
                duration_minutes as "durationMinutes",
                quality,
                deep_sleep_minutes as "deepSleepMinutes",
                light_sleep_minutes as "lightSleepMinutes",
                rem_sleep_minutes as "remSleepMinutes",
                awake_minutes as "awakeMinutes",
                factors,
                notes,
                created_at as "createdAt"
            `,
            [
                logId,
                userId,
                bedTime,
                wakeTime,
                durationMinutes,
                data.quality ?? null,
                data.deepSleepMinutes ?? null,
                data.lightSleepMinutes ?? null,
                data.remSleepMinutes ?? null,
                data.awakeMinutes ?? null,
                data.factors ?? null,
                data.notes ?? null,
            ]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Sleep log not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ logId, userId }, 'Sleep log updated');
        return result.rows[0];
    }

    /**
     * Delete a sleep log.
     */
    async deleteSleepLog(logId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            'DELETE FROM sleep_logs WHERE id = $1 AND user_id = $2 RETURNING id',
            [logId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Sleep log not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ logId, userId }, 'Sleep log deleted');
    }

    // ─── Statistics ───────────────────────────────────────────

    /**
     * Calculate sleep statistics for a user.
     */
    async getSleepStats(userId: string, days: number = 30): Promise<SleepStats> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await this.pool.query(
            `
            SELECT
                AVG(duration_minutes) as avg_duration,
                AVG(quality) as avg_quality,
                AVG(deep_sleep_minutes) as avg_deep,
                AVG(rem_sleep_minutes) as avg_rem,
                COUNT(*) as total_entries
            FROM sleep_logs
            WHERE user_id = $1 AND bed_time >= $2
            `,
            [userId, startDate]
        );

        const row = result.rows[0];
        const totalEntries = parseInt(row.total_entries, 10);

        if (totalEntries === 0) {
            return {
                avgDuration: 0,
                avgQuality: 0,
                avgDeepSleep: 0,
                avgRemSleep: 0,
                totalEntries: 0,
                bestNight: null,
                worstNight: null,
                consistencyScore: 0,
                trend: 'stable',
            };
        }

        // Find best and worst nights
        const [bestResult, worstResult] = await Promise.all([
            this.pool.query(
                `
                SELECT * FROM sleep_logs
                WHERE user_id = $1 AND bed_time >= $2
                ORDER BY quality DESC, duration_minutes DESC
                LIMIT 1
                `,
                [userId, startDate]
            ),
            this.pool.query(
                `
                SELECT * FROM sleep_logs
                WHERE user_id = $1 AND bed_time >= $2
                ORDER BY quality ASC, duration_minutes ASC
                LIMIT 1
                `,
                [userId, startDate]
            ),
        ]);

        // Calculate consistency: variance in duration
        const varianceResult = await this.pool.query(
            `
            SELECT STDDEV(duration_minutes) as stddev_duration
            FROM sleep_logs
            WHERE user_id = $1 AND bed_time >= $2
            `,
            [userId, startDate]
        );

        const stddev = parseFloat(varianceResult.rows[0]?.stddev_duration) || 0;
        const avgDuration = parseFloat(row.avg_duration) || 0;
        // Consistency score: 100 = perfectly consistent, 0 = highly variable
        const consistencyScore = avgDuration > 0
            ? Math.max(0, Math.round(100 - (stddev / avgDuration) * 100))
            : 0;

        // Determine trend from first half vs second half
        const trend = await this.calculateTrend(userId, days);

        return {
            avgDuration: Math.round(avgDuration),
            avgQuality: Math.round(parseFloat(row.avg_quality) * 10) / 10,
            avgDeepSleep: Math.round(parseFloat(row.avg_deep)),
            avgRemSleep: Math.round(parseFloat(row.avg_rem)),
            totalEntries,
            bestNight: bestResult.rows[0] || null,
            worstNight: worstResult.rows[0] || null,
            consistencyScore,
            trend,
        };
    }

    /**
     * Get sleep trend data for charting.
     */
    async getSleepTrends(userId: string, days: number = 14): Promise<SleepTrend[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await this.pool.query(
            `
            SELECT
                DATE(bed_time) as date,
                duration_minutes as "durationMinutes",
                quality,
                deep_sleep_minutes as "deepSleepMinutes"
            FROM sleep_logs
            WHERE user_id = $1 AND bed_time >= $2
            ORDER BY bed_time ASC
            `,
            [userId, startDate]
        );

        return result.rows.map((row: any) => ({
            date: row.date,
            durationMinutes: parseInt(row.durationMinutes, 10),
            quality: parseFloat(row.quality),
            deepSleepMinutes: parseInt(row.deepSleepMinutes, 10),
        }));
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Calculate sleep quality score based on duration and factors.
     */
    private calculateSleepQuality(durationMinutes: number, factors: string[]): number {
        const hours = durationMinutes / 60;
        let score = 5; // base score

        // Duration scoring
        if (hours >= 7 && hours <= 9) score += 3;
        else if (hours >= 6 && hours < 7) score += 1;
        else if (hours >= 9 && hours <= 10) score += 1;
        else if (hours < 5) score -= 2;
        else if (hours > 11) score -= 1;

        // Factor penalties
        const negativeFactors = ['caffeine', 'stress', 'alcohol', 'screen_time', 'late_meal', 'noise'];
        for (const factor of factors) {
            if (negativeFactors.includes(factor)) score -= 0.5;
        }

        const positiveFactors = ['exercise', 'meditation', 'reading', 'cool_room', 'dark_room'];
        for (const factor of factors) {
            if (positiveFactors.includes(factor)) score += 0.5;
        }

        return Math.max(1, Math.min(10, Math.round(score)));
    }

    /**
     * Calculate trend direction.
     */
    private async calculateTrend(userId: string, days: number): Promise<'improving' | 'declining' | 'stable'> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await this.pool.query(
            `
            WITH half AS (
                SELECT
                    NTILE(2) OVER (ORDER BY bed_time ASC) as half,
                    quality,
                    duration_minutes
                FROM sleep_logs
                WHERE user_id = $1 AND bed_time >= $2
            )
            SELECT
                half,
                AVG(quality * 0.5 + (duration_minutes / 60) * 0.5) as score
            FROM half
            GROUP BY half
            ORDER BY half
            `,
            [userId, startDate]
        );

        if (result.rows.length < 2) return 'stable';

        const firstHalf = parseFloat(result.rows[0].score);
        const secondHalf = parseFloat(result.rows[1].score);
        const diff = secondHalf - firstHalf;

        if (diff > 0.3) return 'improving';
        if (diff < -0.3) return 'declining';
        return 'stable';
    }
}
