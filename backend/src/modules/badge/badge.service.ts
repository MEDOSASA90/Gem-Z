/**
 * GEM Z — Badges System Service
 *
 * Business logic for gamification badges:
 * - Define badge criteria and types
 * - Check and award badges
 * - Track badge progress
 * - Badge collection and statistics
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

const log = createLogger('badge-service');

// ─── Types ──────────────────────────────────────────────────────

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: 'fitness' | 'nutrition' | 'social' | 'sleep' | 'hydration' | 'consistency' | 'milestone';
    criteria: Record<string, any>;
    pointsAwarded: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    createdAt: Date;
}

export interface UserBadge {
    id: string;
    userId: string;
    badgeId: string;
    awardedAt: Date;
    badgeName?: string;
    badgeDescription?: string;
    badgeIcon?: string;
    badgeColor?: string;
    badgeCategory?: string;
    badgeTier?: string;
    pointsAwarded?: number;
}

export interface BadgeProgress {
    badgeId: string;
    badgeName: string;
    badgeDescription: string;
    badgeIcon: string;
    badgeColor: string;
    badgeCategory: string;
    badgeTier: string;
    pointsAwarded: number;
    progress: number; // 0-100
    currentValue: number;
    targetValue: number;
    unit: string;
    earned: boolean;
    earnedAt: Date | null;
}

export interface BadgeStats {
    totalBadges: number;
    earnedBadges: number;
    totalPoints: number;
    categoryBreakdown: Record<string, number>;
    tierBreakdown: Record<string, number>;
    recentBadges: UserBadge[];
}

// ─── Service ────────────────────────────────────────────────────

export class BadgeService {
    constructor(private pool: Pool) {}

    // ─── Badge CRUD ───────────────────────────────────────────

    /**
     * Seed default badges if they don't exist.
     */
    async seedBadges(): Promise<void> {
        const defaultBadges = [
            // Fitness
            { name: 'First Workout', description: 'Complete your first workout', icon: 'fitness_center', color: '#FF6B35', category: 'fitness', tier: 'bronze', points: 10, criteria: { type: 'workouts_completed', minValue: 1 } },
            { name: 'Gym Regular', description: 'Complete 50 workouts', icon: 'fitness_center', color: '#C0C0C0', category: 'fitness', tier: 'silver', points: 50, criteria: { type: 'workouts_completed', minValue: 50 } },
            { name: 'Fitness Fanatic', description: 'Complete 200 workouts', icon: 'fitness_center', color: '#FFD700', category: 'fitness', tier: 'gold', points: 200, criteria: { type: 'workouts_completed', minValue: 200 } },
            { name: 'Iron Champion', description: 'Complete 500 workouts', icon: 'fitness_center', color: '#00B8FF', category: 'fitness', tier: 'platinum', points: 500, criteria: { type: 'workouts_completed', minValue: 500 } },
            { name: '7-Day Streak', description: 'Workout 7 days in a row', icon: 'local_fire_department', color: '#FF6B35', category: 'consistency', tier: 'bronze', points: 25, criteria: { type: 'streak_days', minValue: 7 } },
            { name: '30-Day Streak', description: 'Workout 30 days in a row', icon: 'local_fire_department', color: '#FFD700', category: 'consistency', tier: 'gold', points: 150, criteria: { type: 'streak_days', minValue: 30 } },
            { name: '100-Day Streak', description: 'Workout 100 days in a row', icon: 'local_fire_department', color: '#00B8FF', category: 'consistency', tier: 'platinum', points: 500, criteria: { type: 'streak_days', minValue: 100 } },

            // Hydration
            { name: 'First Sip', description: 'Log your first water intake', icon: 'water_drop', color: '#FF6B35', category: 'hydration', tier: 'bronze', points: 5, criteria: { type: 'water_logs', minValue: 1 } },
            { name: 'Hydrated Hero', description: 'Meet your water goal 30 days', icon: 'water_drop', color: '#FFD700', category: 'hydration', tier: 'gold', points: 100, criteria: { type: 'water_goal_days', minValue: 30 } },
            { name: '7-Day Water Streak', description: 'Meet water goal 7 days in a row', icon: 'water_drop', color: '#C0C0C0', category: 'hydration', tier: 'silver', points: 50, criteria: { type: 'water_streak', minValue: 7 } },

            // Sleep
            { name: 'Well Rested', description: 'Log 8 hours of sleep for 7 days', icon: 'bedtime', color: '#FF6B35', category: 'sleep', tier: 'bronze', points: 20, criteria: { type: 'sleep_quality_days', minValue: 7, minHours: 8 } },
            { name: 'Sleep Master', description: 'Log 8 hours of sleep for 30 days', icon: 'bedtime', color: '#FFD700', category: 'sleep', tier: 'gold', points: 100, criteria: { type: 'sleep_quality_days', minValue: 30, minHours: 8 } },

            // Nutrition
            { name: 'Meal Planner', description: 'Create your first meal plan', icon: 'restaurant', color: '#FF6B35', category: 'nutrition', tier: 'bronze', points: 15, criteria: { type: 'meal_plans_created', minValue: 1 } },
            { name: 'Chef\'s Kiss', description: 'Create 10 meal plans', icon: 'restaurant', color: '#C0C0C0', category: 'nutrition', tier: 'silver', points: 75, criteria: { type: 'meal_plans_created', minValue: 10 } },

            // Social
            { name: 'Community Member', description: 'Join your first community challenge', icon: 'groups', color: '#FF6B35', category: 'social', tier: 'bronze', points: 10, criteria: { type: 'challenges_joined', minValue: 1 } },
            { name: 'Challenge Champion', description: 'Complete 5 community challenges', icon: 'emoji_events', color: '#FFD700', category: 'social', tier: 'gold', points: 150, criteria: { type: 'challenges_completed', minValue: 5 } },
            { name: 'Squad Leader', description: 'Create a squad with 10 members', icon: 'groups', color: '#FFD700', category: 'social', tier: 'gold', points: 100, criteria: { type: 'squad_members', minValue: 10 } },

            // Milestones
            { name: 'Week 1', description: 'Complete your first week', icon: 'calendar_today', color: '#FF6B35', category: 'milestone', tier: 'bronze', points: 10, criteria: { type: 'days_active', minValue: 7 } },
            { name: 'Month 1', description: 'Active for 30 days', icon: 'calendar_month', color: '#C0C0C0', category: 'milestone', tier: 'silver', points: 50, criteria: { type: 'days_active', minValue: 30 } },
            { name: 'Centurion', description: 'Active for 100 days', icon: 'military_tech', color: '#FFD700', category: 'milestone', tier: 'gold', points: 200, criteria: { type: 'days_active', minValue: 100 } },
            { name: 'Year One', description: 'Active for 365 days', icon: 'verified', color: '#00B8FF', category: 'milestone', tier: 'platinum', points: 1000, criteria: { type: 'days_active', minValue: 365 } },
            { name: 'Diamond Elite', description: 'Earn 5000 total points', icon: 'diamond', color: '#B9F2FF', category: 'milestone', tier: 'diamond', points: 500, criteria: { type: 'total_points', minValue: 5000 } },
        ];

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const badge of defaultBadges) {
                await client.query(
                    `
                    INSERT INTO badges (id, name, description, icon, color, category, criteria, points_awarded, tier)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (name) DO NOTHING
                    `,
                    [uuidv4(), badge.name, badge.description, badge.icon, badge.color, badge.category, JSON.stringify(badge.criteria), badge.points, badge.tier]
                );
            }

            await client.query('COMMIT');
            log.info('Default badges seeded');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error }, 'Failed to seed badges');
        } finally {
            client.release();
        }
    }

    /**
     * List all available badges with user's progress.
     */
    async listBadges(userId: string): Promise<BadgeProgress[]> {
        // Ensure badges are seeded
        await this.seedBadges();

        const result = await this.pool.query(
            `
            SELECT
                b.id as "badgeId",
                b.name as "badgeName",
                b.description as "badgeDescription",
                b.icon as "badgeIcon",
                b.color as "badgeColor",
                b.category as "badgeCategory",
                b.tier as "badgeTier",
                b.points_awarded as "pointsAwarded",
                b.criteria,
                EXISTS (
                    SELECT 1 FROM user_badges ub
                    WHERE ub.badge_id = b.id AND ub.user_id = $1
                ) as "earned",
                (
                    SELECT ub2.awarded_at FROM user_badges ub2
                    WHERE ub2.badge_id = b.id AND ub2.user_id = $1
                ) as "earnedAt"
            FROM badges b
            ORDER BY
                CASE b.tier
                    WHEN 'bronze' THEN 1
                    WHEN 'silver' THEN 2
                    WHEN 'gold' THEN 3
                    WHEN 'platinum' THEN 4
                    WHEN 'diamond' THEN 5
                END,
                b.category, b.name
            `,
            [userId]
        );

        const badgeProgress: BadgeProgress[] = [];
        for (const row of result.rows) {
            const { progress, currentValue } = await this.calculateBadgeProgress(userId, row.criteria);
            const criteria = typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria;

            badgeProgress.push({
                badgeId: row.badgeId,
                badgeName: row.badgeName,
                badgeDescription: row.badgeDescription,
                badgeIcon: row.badgeIcon,
                badgeColor: row.badgeColor,
                badgeCategory: row.badgeCategory,
                badgeTier: row.badgeTier,
                pointsAwarded: parseInt(row.pointsAwarded, 10),
                progress: row.earned ? 100 : Math.min(100, progress),
                currentValue,
                targetValue: criteria.minValue || criteria.minHours || 1,
                unit: this.getUnitForCriteria(criteria),
                earned: row.earned,
                earnedAt: row.earnedAt,
            });
        }

        return badgeProgress;
    }

    /**
     * Check if user qualifies for any new badges and award them.
     */
    async checkAndAwardBadges(userId: string): Promise<{ awarded: UserBadge[]; pointsEarned: number }> {
        await this.seedBadges();

        // Get all badges not yet earned
        const unearnedResult = await this.pool.query(
            `
            SELECT b.* FROM badges b
            WHERE NOT EXISTS (
                SELECT 1 FROM user_badges ub
                WHERE ub.badge_id = b.id AND ub.user_id = $1
            )
            `,
            [userId]
        );

        const awarded: UserBadge[] = [];
        let pointsEarned = 0;

        for (const badge of unearnedResult.rows) {
            const criteria = typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria;
            const { progress } = await this.calculateBadgeProgress(userId, criteria);

            if (progress >= 100) {
                const userBadgeId = uuidv4();
                const result = await this.pool.query(
                    `
                    INSERT INTO user_badges (id, user_id, badge_id)
                    VALUES ($1, $2, $3)
                    RETURNING
                        id,
                        user_id as "userId",
                        badge_id as "badgeId",
                        awarded_at as "awardedAt"
                    `,
                    [userBadgeId, userId, badge.id]
                );

                awarded.push({
                    ...result.rows[0],
                    badgeName: badge.name,
                    badgeDescription: badge.description,
                    badgeIcon: badge.icon,
                    badgeColor: badge.color,
                    badgeCategory: badge.category,
                    badgeTier: badge.tier,
                    pointsAwarded: parseInt(badge.points_awarded, 10),
                });

                pointsEarned += parseInt(badge.points_awarded, 10);
                log.info({ userId, badgeId: badge.id, badgeName: badge.name }, 'Badge awarded');
            }
        }

        return { awarded, pointsEarned };
    }

    /**
     * Get user's badge statistics.
     */
    async getBadgeStats(userId: string): Promise<BadgeStats> {
        const result = await this.pool.query(
            `
            SELECT
                (SELECT COUNT(*) FROM badges) as total,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as earned,
                (SELECT COALESCE(SUM(b.points_awarded), 0) FROM user_badges ub
                 JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = $1) as points
            `,
            [userId]
        );

        const row = result.rows[0];
        const totalBadges = parseInt(row.total, 10);
        const earnedBadges = parseInt(row.earned, 10);
        const totalPoints = parseInt(row.points, 10);

        // Category breakdown
        const categoryResult = await this.pool.query(
            `
            SELECT b.category, COUNT(*) as count
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = $1
            GROUP BY b.category
            `,
            [userId]
        );

        const categoryBreakdown: Record<string, number> = {};
        for (const cr of categoryResult.rows) {
            categoryBreakdown[cr.category] = parseInt(cr.count, 10);
        }

        // Tier breakdown
        const tierResult = await this.pool.query(
            `
            SELECT b.tier, COUNT(*) as count
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = $1
            GROUP BY b.tier
            `,
            [userId]
        );

        const tierBreakdown: Record<string, number> = {};
        for (const tr of tierResult.rows) {
            tierBreakdown[tr.tier] = parseInt(tr.count, 10);
        }

        // Recent badges
        const recentResult = await this.pool.query(
            `
            SELECT
                ub.id,
                ub.user_id as "userId",
                ub.badge_id as "badgeId",
                ub.awarded_at as "awardedAt",
                b.name as "badgeName",
                b.description as "badgeDescription",
                b.icon as "badgeIcon",
                b.color as "badgeColor",
                b.category as "badgeCategory",
                b.tier as "badgeTier",
                b.points_awarded as "pointsAwarded"
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = $1
            ORDER BY ub.awarded_at DESC
            LIMIT 10
            `,
            [userId]
        );

        return {
            totalBadges,
            earnedBadges,
            totalPoints,
            categoryBreakdown,
            tierBreakdown,
            recentBadges: recentResult.rows,
        };
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Calculate progress for a specific badge criteria.
     */
    private async calculateBadgeProgress(
        userId: string,
        criteria: Record<string, any>
    ): Promise<{ progress: number; currentValue: number }> {
        const { type, minValue, minHours } = criteria;
        let currentValue = 0;

        switch (type) {
            case 'workouts_completed': {
                const result = await this.pool.query(
                    'SELECT COALESCE(total_workouts, 0) as val FROM trainee_profiles WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'streak_days': {
                const result = await this.pool.query(
                    'SELECT COALESCE(streak_days, 0) as val FROM trainee_profiles WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'water_logs': {
                const result = await this.pool.query(
                    'SELECT COUNT(*) as val FROM water_logs WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'water_goal_days': {
                const result = await this.pool.query(
                    `
                    SELECT COUNT(*) as val FROM (
                        SELECT DATE(logged_at) as day, SUM(amount_ml)
                        FROM water_logs WHERE user_id = $1
                        GROUP BY DATE(logged_at)
                        HAVING SUM(amount_ml) >= 2500
                    ) goal_days
                    `,
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'water_streak': {
                // Get the current water streak
                const result = await this.pool.query(
                    `
                    WITH daily AS (
                        SELECT DATE(logged_at) as day, SUM(amount_ml) as total
                        FROM water_logs WHERE user_id = $1
                        GROUP BY DATE(logged_at)
                        HAVING SUM(amount_ml) >= 2500
                        ORDER BY day DESC
                    )
                    SELECT COUNT(*) as val FROM daily
                    WHERE day >= CURRENT_DATE - INTERVAL '30 days'
                    `,
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'sleep_quality_days': {
                const result = await this.pool.query(
                    `
                    SELECT COUNT(*) as val FROM sleep_logs
                    WHERE user_id = $1 AND duration_minutes >= $2
                    `,
                    [userId, (minHours || 8) * 60]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'meal_plans_created': {
                const result = await this.pool.query(
                    'SELECT COUNT(*) as val FROM meal_plans WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'challenges_joined': {
                const result = await this.pool.query(
                    'SELECT COUNT(*) as val FROM challenge_participants WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'challenges_completed': {
                const result = await this.pool.query(
                    'SELECT COUNT(*) as val FROM challenge_participants WHERE user_id = $1 AND completed = TRUE',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'squad_members': {
                const result = await this.pool.query(
                    `
                    SELECT COALESCE(MAX(members_count), 0) as val FROM (
                        SELECT s.id, COUNT(sm.user_id) as members_count
                        FROM squads s
                        JOIN squad_members sm ON s.id = sm.squad_id
                        WHERE s.creator_id = $1
                        GROUP BY s.id
                    ) squad_counts
                    `,
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'days_active': {
                const result = await this.pool.query(
                    `
                    SELECT COALESCE(
                        (CURRENT_DATE - DATE(created_at)), 0
                    ) as val FROM trainee_profiles WHERE user_id = $1
                    `
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            case 'total_points': {
                const result = await this.pool.query(
                    'SELECT COALESCE(total_points, 0) as val FROM trainee_profiles WHERE user_id = $1',
                    [userId]
                );
                currentValue = parseInt(result.rows[0]?.val || '0', 10);
                break;
            }
            default:
                currentValue = 0;
        }

        const target = minValue || minHours || 1;
        const progress = Math.min(100, Math.round((currentValue / target) * 100));

        return { progress, currentValue };
    }

    private getUnitForCriteria(criteria: Record<string, any>): string {
        switch (criteria.type) {
            case 'workouts_completed': return 'workouts';
            case 'streak_days': return 'days';
            case 'water_logs': return 'logs';
            case 'water_goal_days': return 'days';
            case 'water_streak': return 'days';
            case 'sleep_quality_days': return 'days';
            case 'meal_plans_created': return 'plans';
            case 'challenges_joined': return 'challenges';
            case 'challenges_completed': return 'challenges';
            case 'squad_members': return 'members';
            case 'days_active': return 'days';
            case 'total_points': return 'points';
            default: return 'units';
        }
    }
}
