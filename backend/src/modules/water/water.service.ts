/**
 * GEM Z — Water Tracking Service
 *
 * Business logic for water intake tracking:
 * - Log water intake entries
 * - Daily goal tracking with streaks
 * - Reminder scheduling
 * - Weekly/monthly hydration analytics
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

const log = createLogger('water-service');

// ─── Types ──────────────────────────────────────────────────────

export interface WaterLog {
    id: string;
    userId: string;
    amountMl: number;
    loggedAt: Date;
    source: 'manual' | 'reminder' | 'wearable';
    notes: string | null;
    createdAt: Date;
}

export interface WaterDailySummary {
    date: string;
    totalIntakeMl: number;
    goalMl: number;
    percentage: number;
    entriesCount: number;
    goalMet: boolean;
    remainingMl: number;
}

export interface WaterStats {
    currentStreak: number;
    longestStreak: number;
    totalIntakeAllTime: number;
    avgDailyIntake: number;
    daysGoalMet: number;
    totalDays: number;
    goalCompletionRate: number;
}

export interface WaterReminder {
    id: string;
    userId: string;
    enabled: boolean;
    intervalMinutes: number;
    startTime: string; // HH:MM
    endTime: string;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class WaterService {
    private readonly DEFAULT_GOAL_ML = 2500;

    constructor(private pool: Pool) {}

    // ─── Water Log CRUD ───────────────────────────────────────

    /**
     * Log a water intake entry.
     */
    async logWater(
        userId: string,
        data: {
            amountMl: number;
            source?: 'manual' | 'reminder' | 'wearable';
            notes?: string;
        }
    ): Promise<WaterLog> {
        const amountMl = data.amountMl;
        if (!amountMl || amountMl < 10 || amountMl > 5000) {
            throw new ValidationError(
                'Water amount must be between 10ml and 5000ml',
                ErrorCode.INVALID_INPUT
            );
        }

        const logId = uuidv4();
        const source = data.source || 'manual';

        try {
            const result = await this.pool.query(
                `
                INSERT INTO water_logs (id, user_id, amount_ml, source, notes)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    id,
                    user_id as "userId",
                    amount_ml as "amountMl",
                    logged_at as "loggedAt",
                    source,
                    notes,
                    created_at as "createdAt"
                `,
                [logId, userId, amountMl, source, data.notes || null]
            );

            // Check if daily goal was met
            const dailySummary = await this.getDailySummary(userId, new Date());

            log.info(
                { logId, userId, amountMl, goalMet: dailySummary.goalMet },
                'Water intake logged'
            );

            return result.rows[0];
        } catch (error) {
            log.error({ error, userId }, 'Failed to log water intake');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to log water intake', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Get today's water logs for a user.
     */
    async getTodayLogs(userId: string): Promise<{ logs: WaterLog[]; summary: WaterDailySummary }> {
        const today = new Date();
        const logs = await this.getLogsForDate(userId, today);
        const summary = await this.getDailySummary(userId, today);
        return { logs, summary };
    }

    /**
     * Get water logs for a specific date.
     */
    async getLogsForDate(userId: string, date: Date): Promise<WaterLog[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await this.pool.query(
            `
            SELECT
                id,
                user_id as "userId",
                amount_ml as "amountMl",
                logged_at as "loggedAt",
                source,
                notes,
                created_at as "createdAt"
            FROM water_logs
            WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3
            ORDER BY logged_at DESC
            `,
            [userId, startOfDay, endOfDay]
        );

        return result.rows;
    }

    /**
     * Get daily summary for a date.
     */
    async getDailySummary(userId: string, date: Date): Promise<WaterDailySummary> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const goalMl = await this.getUserGoal(userId);

        const result = await this.pool.query(
            `
            SELECT
                COALESCE(SUM(amount_ml), 0) as total,
                COUNT(*) as entries
            FROM water_logs
            WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3
            `,
            [userId, startOfDay, endOfDay]
        );

        const totalIntakeMl = parseInt(result.rows[0].total, 10);
        const entriesCount = parseInt(result.rows[0].entries, 10);
        const percentage = Math.min(100, Math.round((totalIntakeMl / goalMl) * 100));

        return {
            date: startOfDay.toISOString().split('T')[0],
            totalIntakeMl,
            goalMl,
            percentage,
            entriesCount,
            goalMet: totalIntakeMl >= goalMl,
            remainingMl: Math.max(0, goalMl - totalIntakeMl),
        };
    }

    /**
     * Get weekly summary.
     */
    async getWeeklySummary(userId: string): Promise<WaterDailySummary[]> {
        const today = new Date();
        const summaries: WaterDailySummary[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const summary = await this.getDailySummary(userId, date);
            summaries.push(summary);
        }

        return summaries;
    }

    /**
     * Delete a water log entry.
     */
    async deleteWaterLog(logId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            'DELETE FROM water_logs WHERE id = $1 AND user_id = $2 RETURNING id',
            [logId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Water log not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ logId, userId }, 'Water log deleted');
    }

    // ─── Goals ────────────────────────────────────────────────

    /**
     * Get user's daily water goal.
     */
    async getUserGoal(userId: string): Promise<number> {
        const result = await this.pool.query(
            'SELECT water_goal_ml FROM trainee_profiles WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].water_goal_ml) {
            return this.DEFAULT_GOAL_ML;
        }

        return parseInt(result.rows[0].water_goal_ml, 10);
    }

    /**
     * Set user's daily water goal.
     */
    async setUserGoal(userId: string, goalMl: number): Promise<void> {
        if (goalMl < 500 || goalMl > 10000) {
            throw new ValidationError(
                'Water goal must be between 500ml and 10000ml',
                ErrorCode.INVALID_INPUT
            );
        }

        await this.pool.query(
            `
            INSERT INTO trainee_profiles (user_id, water_goal_ml, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET water_goal_ml = EXCLUDED.water_goal_ml, updated_at = NOW()
            `,
            [userId, goalMl]
        );

        log.info({ userId, goalMl }, 'Water goal updated');
    }

    // ─── Statistics ───────────────────────────────────────────

    /**
     * Calculate water intake statistics.
     */
    async getWaterStats(userId: string): Promise<WaterStats> {
        // Get all-time totals
        const totalResult = await this.pool.query(
            `
            SELECT
                COALESCE(SUM(amount_ml), 0) as total,
                COUNT(DISTINCT DATE(logged_at)) as days_tracked
            FROM water_logs
            WHERE user_id = $1
            `,
            [userId]
        );

        const goalMl = await this.getUserGoal(userId);

        // Get daily summaries for streak calculation
        const dailyResult = await this.pool.query(
            `
            WITH daily AS (
                SELECT
                    DATE(logged_at) as day,
                    SUM(amount_ml) as total
                FROM water_logs
                WHERE user_id = $1
                GROUP BY DATE(logged_at)
                ORDER BY day DESC
            )
            SELECT day, total FROM daily
            `,
            [userId]
        );

        const days = dailyResult.rows;
        const daysGoalMet = days.filter((d: any) => parseInt(d.total, 10) >= goalMl).length;
        const totalDays = days.length;

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < days.length; i++) {
            const dayStr = new Date(days[i].day).toISOString().split('T')[0];
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            const expectedStr = expectedDate.toISOString().split('T')[0];

            if (dayStr === expectedStr && parseInt(days[i].total, 10) >= goalMl) {
                currentStreak++;
            } else if (i === 0 && dayStr === today && parseInt(days[i].total, 10) >= goalMl) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        let lastDay: Date | null = null;

        for (const day of [...days].reverse()) {
            const dayDate = new Date(day.day);
            const metGoal = parseInt(day.total, 10) >= goalMl;

            if (metGoal) {
                if (lastDay) {
                    const diff = (dayDate.getTime() - lastDay.getTime()) / 86400000;
                    if (diff === 1) {
                        tempStreak++;
                    } else {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                } else {
                    tempStreak = 1;
                }
                lastDay = dayDate;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

        const totalIntake = parseInt(totalResult.rows[0].total, 10);
        const avgDaily = totalDays > 0 ? Math.round(totalIntake / totalDays) : 0;

        return {
            currentStreak,
            longestStreak,
            totalIntakeAllTime: totalIntake,
            avgDailyIntake: avgDaily,
            daysGoalMet,
            totalDays,
            goalCompletionRate: totalDays > 0 ? Math.round((daysGoalMet / totalDays) * 100) : 0,
        };
    }

    // ─── Reminders ────────────────────────────────────────────

    /**
     * Get user's water reminder settings.
     */
    async getReminder(userId: string): Promise<WaterReminder | null> {
        const result = await this.pool.query(
            `
            SELECT
                id,
                user_id as "userId",
                enabled,
                interval_minutes as "intervalMinutes",
                start_time as "startTime",
                end_time as "endTime",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM water_reminders
            WHERE user_id = $1
            `,
            [userId]
        );

        return result.rows[0] || null;
    }

    /**
     * Set or update water reminder.
     */
    async setReminder(
        userId: string,
        data: {
            enabled: boolean;
            intervalMinutes: number;
            startTime: string;
            endTime: string;
        }
    ): Promise<WaterReminder> {
        if (data.intervalMinutes < 15 || data.intervalMinutes > 240) {
            throw new ValidationError(
                'Reminder interval must be between 15 and 240 minutes',
                ErrorCode.INVALID_INPUT
            );
        }

        // Validate HH:MM format
        const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
            throw new ValidationError(
                'Time must be in HH:MM format',
                ErrorCode.INVALID_INPUT
            );
        }

        const result = await this.pool.query(
            `
            INSERT INTO water_reminders (user_id, enabled, interval_minutes, start_time, end_time)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id)
            DO UPDATE SET
                enabled = EXCLUDED.enabled,
                interval_minutes = EXCLUDED.interval_minutes,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                updated_at = NOW()
            RETURNING
                id,
                user_id as "userId",
                enabled,
                interval_minutes as "intervalMinutes",
                start_time as "startTime",
                end_time as "endTime",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            [userId, data.enabled, data.intervalMinutes, data.startTime, data.endTime]
        );

        log.info({ userId, enabled: data.enabled }, 'Water reminder updated');
        return result.rows[0];
    }
}
