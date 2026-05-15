/**
 * GEM Z — Kid Fitness Service
 *
 * Business logic for kid-friendly fitness:
 * - Age-appropriate workouts (6-12, 13-17)
 * - Gamified challenges with cartoon mascots
 * - Points, badges, parent dashboard
 * - Activity tracking
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import { AppError, ValidationError, NotFoundError } from '../../core/errors';

const log = createLogger('kids-service');

// ─── Types ──────────────────────────────────────────────────────

export type AgeGroup = '6-12' | '13-17';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type MascotType = 'leo_lion' | 'bella_bunny' | 'max_monkey' | 'sophie_star';

export interface KidsWorkout {
    id: string;
    title: string;
    description: string;
    ageGroup: AgeGroup;
    difficulty: DifficultyLevel;
    durationMinutes: number;
    caloriesBurned: number;
    exercises: KidExercise[];
    mascot: MascotType;
    mascotMessage: string;
    category: string;
    pointsReward: number;
    badgeReward: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface KidExercise {
    name: string;
    description: string;
    durationSeconds: number;
    reps: number | null;
    sets: number;
    restSeconds: number;
    animationUrl: string | null;
    mascotTip: string | null;
}

export interface KidsChallenge {
    id: string;
    title: string;
    description: string;
    ageGroup: AgeGroup;
    type: 'daily' | 'weekly' | 'streak';
    goal: number;
    goalUnit: string;
    pointsReward: number;
    badgeName: string | null;
    badgeIcon: string | null;
    badgeColor: string | null;
    mascot: MascotType;
    startDate: string;
    endDate: string;
    isActive: boolean;
    participantsCount: number;
}

export interface KidsActivityLog {
    id: string;
    userId: string;
    workoutId: string | null;
    challengeId: string | null;
    activityType: string;
    pointsEarned: number;
    durationMinutes: number | null;
    caloriesBurned: number | null;
    notes: string | null;
    createdAt: string;
}

export interface KidStats {
    totalPoints: number;
    totalWorkouts: number;
    totalChallenges: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    badges: KidBadge[];
    weeklyActivity: { day: string; minutes: number; points: number }[];
}

export interface KidBadge {
    id: string;
    badgeName: string;
    badgeIcon: string;
    badgeColor: string;
    awardedAt: string;
    pointsAwarded: number;
}

export interface ParentDashboard {
    children: {
        userId: string;
        fullName: string;
        ageGroup: AgeGroup;
        totalPoints: number;
        totalWorkouts: number;
        currentStreak: number;
        totalMinutes: number;
        lastActive: string;
        recentActivities: KidsActivityLog[];
        badges: KidBadge[];
    }[];
}

// ─── Mascot Configs ─────────────────────────────────────────────

export const MASCOT_CONFIGS: Record<MascotType, { name: string; color: string; greeting: string }> = {
    leo_lion: { name: 'Leo the Lion', color: '#FFD700', greeting: 'Roar! Let\'s get strong together!' },
    bella_bunny: { name: 'Bella the Bunny', color: '#FF6B9D', greeting: 'Hop hop! Time to move and groove!' },
    max_monkey: { name: 'Max the Monkey', color: '#8B5E3C', greeting: 'Ooh ooh! Swing into action!' },
    sophie_star: { name: 'Sophie the Star', color: '#9B59B6', greeting: 'Shine bright! You\'re a superstar!' },
};

// ─── Service ────────────────────────────────────────────────────

export class KidsService {
    constructor(private pool: Pool) {}

    // ─── Workouts ───────────────────────────────────────────────

    /**
     * Seed default workouts.
     */
    async seedWorkouts(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await client.query(`SELECT COUNT(*) FROM kids_workouts`);
            if (parseInt(existing.rows[0].count) > 0) {
                await client.query('COMMIT');
                return;
            }

            const workouts: Omit<KidsWorkout, 'id' | 'createdAt'>[] = [
                // Age 6-12
                {
                    title: 'Leo\'s Jungle Adventure', description: 'A fun adventure through the jungle with Leo! Jump, run, and roar your way to fitness.',
                    ageGroup: '6-12', difficulty: 'easy', durationMinutes: 15, caloriesBurned: 80, mascot: 'leo_lion',
                    mascotMessage: 'Follow Leo through the jungle!', category: 'adventure', pointsReward: 50, badgeReward: 'Jungle Explorer',
                    badgeColor: '#FFD700', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Lion Roar Jumps', description: 'Jump up and roar like a lion!', durationSeconds: 30, reps: null, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Roar as loud as you can!' },
                        { name: 'Jungle Crawl', description: 'Crawl on hands and knees through the jungle', durationSeconds: 45, reps: null, sets: 2, restSeconds: 20, animationUrl: null, mascotTip: 'Stay low, the grass is tall!' },
                        { name: 'Tree Climb', description: 'Pretend to climb a tree', durationSeconds: 30, reps: null, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Reach for the sky!' },
                        { name: 'Monkey Swings', description: 'Swing arms side to side', durationSeconds: 30, reps: null, sets: 2, restSeconds: 10, animationUrl: null, mascotTip: 'Swing high like a monkey!' },
                    ],
                },
                {
                    title: 'Bella\'s Hop & Dance Party', description: 'Dance and hop with Bella! A musical workout full of joy.',
                    ageGroup: '6-12', difficulty: 'easy', durationMinutes: 10, caloriesBurned: 60, mascot: 'bella_bunny',
                    mascotMessage: 'Hop along with Bella!', category: 'dance', pointsReward: 40, badgeReward: 'Dance Star',
                    badgeColor: '#FF6B9D', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Bunny Hops', description: 'Hop forward and backward like a bunny', durationSeconds: 30, reps: null, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Big hops! Wiggle your nose!' },
                        { name: 'Freeze Dance', description: 'Dance freely, freeze when music stops', durationSeconds: 60, reps: null, sets: 2, restSeconds: 10, animationUrl: null, mascotTip: 'Hold still like a statue!' },
                        { name: 'Spin & Twirl', description: 'Spin around and twirl', durationSeconds: 20, reps: null, sets: 4, restSeconds: 10, animationUrl: null, mascotTip: 'Don\'t get dizzy!' },
                    ],
                },
                {
                    title: 'Superhero Training Camp', description: 'Train to be a superhero! Strength, speed, and agility.',
                    ageGroup: '6-12', difficulty: 'medium', durationMinutes: 20, caloriesBurned: 120, mascot: 'max_monkey',
                    mascotMessage: 'Train like a hero!', category: 'strength', pointsReward: 75, badgeReward: 'Superhero',
                    badgeColor: '#00B8FF', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Super Push-Ups', description: 'Push-ups with a superhero landing', durationSeconds: 20, reps: 5, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Up, up, and away!' },
                        { name: 'Laser Beam Squats', description: 'Squat and shoot imaginary laser beams', durationSeconds: 30, reps: 8, sets: 3, restSeconds: 20, animationUrl: null, mascotTip: 'Pew pew! Squat low!' },
                        { name: 'Shield Blocks', description: 'Hold arms up like a shield, step side to side', durationSeconds: 30, reps: null, sets: 2, restSeconds: 15, animationUrl: null, mascotTip: 'Protect the city!' },
                        { name: 'Flying Sprints', description: 'Run in place fast like you\'re flying', durationSeconds: 30, reps: null, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Faster than lightning!' },
                    ],
                },
                // Age 13-17
                {
                    title: 'Teen Strength Starter', description: 'A beginner-friendly strength workout designed for teens.',
                    ageGroup: '13-17', difficulty: 'easy', durationMinutes: 25, caloriesBurned: 150, mascot: 'leo_lion',
                    mascotMessage: 'Build strength the right way!', category: 'strength', pointsReward: 80, badgeReward: 'Strength Rookie',
                    badgeColor: '#FFD700', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Bodyweight Squats', description: 'Standard bodyweight squats with proper form', durationSeconds: 40, reps: 12, sets: 3, restSeconds: 30, animationUrl: null, mascotTip: 'Keep your back straight!' },
                        { name: 'Push-Ups', description: 'Standard push-ups', durationSeconds: 30, reps: 8, sets: 3, restSeconds: 30, animationUrl: null, mascotTip: 'Chest almost touches the ground!' },
                        { name: 'Lunges', description: 'Alternating forward lunges', durationSeconds: 40, reps: 10, sets: 3, restSeconds: 30, animationUrl: null, mascotTip: 'Knee at 90 degrees!' },
                        { name: 'Plank', description: 'Hold plank position', durationSeconds: 30, reps: null, sets: 3, restSeconds: 20, animationUrl: null, mascotTip: 'Hold it strong!' },
                    ],
                },
                {
                    title: 'HIIT for Teens', description: 'High-intensity interval training adapted for teenagers.',
                    ageGroup: '13-17', difficulty: 'medium', durationMinutes: 20, caloriesBurned: 200, mascot: 'sophie_star',
                    mascotMessage: 'Push your limits!', category: 'hiit', pointsReward: 100, badgeReward: 'HIIT Hero',
                    badgeColor: '#9B59B6', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Jumping Jacks', description: 'Full jumping jacks', durationSeconds: 45, reps: null, sets: 1, restSeconds: 15, animationUrl: null, mascotTip: 'Get your heart pumping!' },
                        { name: 'Burpees', description: 'Full burpees with jump', durationSeconds: 30, reps: 8, sets: 3, restSeconds: 30, animationUrl: null, mascotTip: 'Explode up!' },
                        { name: 'Mountain Climbers', description: 'Fast mountain climbers', durationSeconds: 30, reps: null, sets: 3, restSeconds: 20, animationUrl: null, mascotTip: 'Quick feet!' },
                        { name: 'High Knees', description: 'Run in place with high knees', durationSeconds: 30, reps: null, sets: 3, restSeconds: 15, animationUrl: null, mascotTip: 'Knees to chest!' },
                    ],
                },
                {
                    title: 'Athletic Performance', description: 'Sport-specific drills for young athletes.',
                    ageGroup: '13-17', difficulty: 'hard', durationMinutes: 30, caloriesBurned: 250, mascot: 'max_monkey',
                    mascotMessage: 'Train like an athlete!', category: 'sports', pointsReward: 120, badgeReward: 'Athlete',
                    badgeColor: '#00FFA3', imageUrl: null, videoUrl: null, isActive: true,
                    exercises: [
                        { name: 'Agility Ladder', description: 'Quick feet through agility ladder', durationSeconds: 45, reps: null, sets: 4, restSeconds: 20, animationUrl: null, mascotTip: 'Fast as lightning!' },
                        { name: 'Box Jumps', description: 'Jump onto a sturdy box or step', durationSeconds: 20, reps: 10, sets: 4, restSeconds: 30, animationUrl: null, mascotTip: 'Soft landing!' },
                        { name: 'Sprints', description: '30-meter sprints', durationSeconds: 15, reps: null, sets: 6, restSeconds: 45, animationUrl: null, mascotTip: 'Full speed!' },
                        { name: 'Lateral Bounds', description: 'Jump side to side', durationSeconds: 30, reps: null, sets: 3, restSeconds: 20, animationUrl: null, mascotTip: 'Power through!' },
                    ],
                },
            ];

            for (const w of workouts) {
                await client.query(
                    `INSERT INTO kids_workouts (id, title, description, age_group, difficulty, duration_minutes, calories_burned, exercises, mascot, mascot_message, category, points_reward, badge_reward, badge_color, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                    [uuidv4(), w.title, w.description, w.ageGroup, w.difficulty, w.durationMinutes, w.caloriesBurned,
                     JSON.stringify(w.exercises), w.mascot, w.mascotMessage, w.category, w.pointsReward,
                     w.badgeReward, w.badgeColor, w.isActive]
                );
            }

            // Seed challenges
            const challenges: Omit<KidsChallenge, 'id'>[] = [
                { title: '7-Day Move Streak', description: 'Complete any workout for 7 days in a row!', ageGroup: '6-12', type: 'streak', goal: 7, goalUnit: 'days', pointsReward: 200, badgeName: 'Streak Champion', badgeIcon: 'local_fire_department', badgeColor: '#FF6B35', mascot: 'leo_lion', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
                { title: 'Daily 15-Minute Move', description: 'Move for at least 15 minutes every day this week', ageGroup: '6-12', type: 'daily', goal: 7, goalUnit: 'days', pointsReward: 150, badgeName: 'Daily Mover', badgeIcon: 'schedule', badgeColor: '#00B8FF', mascot: 'bella_bunny', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
                { title: '1000 Points Challenge', description: 'Earn 1000 points from workouts this month', ageGroup: '13-17', type: 'weekly', goal: 1000, goalUnit: 'points', pointsReward: 500, badgeName: 'Point Master', badgeIcon: 'emoji_events', badgeColor: '#FFD700', mascot: 'sophie_star', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
                { title: 'Cardio Crusher', description: 'Burn 500 calories in cardio workouts this week', ageGroup: '13-17', type: 'weekly', goal: 500, goalUnit: 'calories', pointsReward: 300, badgeName: 'Cardio King', badgeIcon: 'favorite', badgeColor: '#E74C3C', mascot: 'max_monkey', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
                { title: 'Flexibility Master', description: 'Complete 5 stretching sessions this week', ageGroup: '6-12', type: 'weekly', goal: 5, goalUnit: 'sessions', pointsReward: 200, badgeName: 'Flex Star', badgeIcon: 'self_improvement', badgeColor: '#27AE60', mascot: 'bella_bunny', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
                { title: '30-Minute Power', description: 'Complete a 30-minute workout 3 times this week', ageGroup: '13-17', type: 'weekly', goal: 3, goalUnit: 'workouts', pointsReward: 250, badgeName: 'Power Player', badgeIcon: 'bolt', badgeColor: '#F39C12', mascot: 'leo_lion', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), isActive: true, participantsCount: 0 },
            ];

            for (const c of challenges) {
                await client.query(
                    `INSERT INTO kids_challenges (id, title, description, age_group, type, goal, goal_unit, points_reward, badge_name, badge_icon, badge_color, mascot, start_date, end_date, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                    [uuidv4(), c.title, c.description, c.ageGroup, c.type, c.goal, c.goalUnit, c.pointsReward,
                     c.badgeName, c.badgeIcon, c.badgeColor, c.mascot, c.startDate, c.endDate, c.isActive]
                );
            }

            await client.query('COMMIT');
            log.info('Kids workouts and challenges seeded');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * List workouts by age group.
     */
    async getWorkouts(ageGroup?: AgeGroup, category?: string, difficulty?: string): Promise<KidsWorkout[]> {
        await this.seedWorkouts();

        let query = `SELECT id, title, description, age_group as "ageGroup", difficulty, duration_minutes as "durationMinutes",
                            calories_burned as "caloriesBurned", exercises, mascot, mascot_message as "mascotMessage",
                            category, points_reward as "pointsReward", badge_reward as "badgeReward", badge_color as "badgeColor",
                            image_url as "imageUrl", video_url as "videoUrl", is_active as "isActive", created_at as "createdAt"
                     FROM kids_workouts WHERE is_active = TRUE`;
        const params: any[] = [];

        if (ageGroup) {
            params.push(ageGroup);
            query += ` AND age_group = $${params.length}`;
        }
        if (category && category !== 'all') {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }
        if (difficulty && difficulty !== 'all') {
            params.push(difficulty);
            query += ` AND difficulty = $${params.length}`;
        }

        query += ` ORDER BY age_group, difficulty, points_reward`;

        const result = await this.pool.query(query, params);
        return result.rows.map(row => ({
            ...row,
            exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
        }));
    }

    /**
     * Get a single workout.
     */
    async getWorkout(workoutId: string): Promise<KidsWorkout> {
        await this.seedWorkouts();

        const result = await this.pool.query(
            `SELECT id, title, description, age_group as "ageGroup", difficulty, duration_minutes as "durationMinutes",
                    calories_burned as "caloriesBurned", exercises, mascot, mascot_message as "mascotMessage",
                    category, points_reward as "pointsReward", badge_reward as "badgeReward", badge_color as "badgeColor",
                    image_url as "imageUrl", video_url as "videoUrl", is_active as "isActive", created_at as "createdAt"
             FROM kids_workouts WHERE id = $1 AND is_active = TRUE`,
            [workoutId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Workout not found');
        }

        return {
            ...result.rows[0],
            exercises: typeof result.rows[0].exercises === 'string' ? JSON.parse(result.rows[0].exercises) : result.rows[0].exercises,
        };
    }

    /**
     * Log a completed workout.
     */
    async logWorkout(userId: string, workoutId: string, durationMinutes?: number): Promise<{ log: KidsActivityLog; pointsEarned: number }> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const workout = await this.getWorkout(workoutId);
            const actualDuration = durationMinutes || workout.durationMinutes;

            const logId = uuidv4();
            const logResult = await client.query(
                `INSERT INTO kids_activity_logs (id, user_id, workout_id, activity_type, points_earned, duration_minutes, calories_burned)
                 VALUES ($1, $2, $3, 'workout', $4, $5, $6)
                 RETURNING id, user_id as "userId", workout_id as "workoutId", activity_type as "activityType",
                           points_earned as "pointsEarned", duration_minutes as "durationMinutes",
                           calories_burned as "caloriesBurned", created_at as "createdAt"`,
                [logId, userId, workoutId, workout.pointsReward, actualDuration, workout.caloriesBurned]
            );

            // Award badge if applicable
            if (workout.badgeReward) {
                await client.query(
                    `INSERT INTO kids_badges (id, user_id, badge_name, badge_icon, badge_color, points_awarded)
                     VALUES ($1, $2, $3, 'emoji_events', $4, $5)
                     ON CONFLICT (user_id, badge_name) DO NOTHING`,
                    [uuidv4(), userId, workout.badgeReward, workout.badgeColor, workout.pointsReward]
                );
            }

            await client.query('COMMIT');

            log.info({ userId, workoutId, pointsEarned: workout.pointsReward }, 'Kids workout logged');
            return { log: logResult.rows[0], pointsEarned: workout.pointsReward };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Challenges ─────────────────────────────────────────────

    /**
     * List challenges.
     */
    async getChallenges(ageGroup?: AgeGroup, type?: string): Promise<KidsChallenge[]> {
        await this.seedWorkouts();

        let query = `SELECT id, title, description, age_group as "ageGroup", type, goal, goal_unit as "goalUnit",
                            points_reward as "pointsReward", badge_name as "badgeName", badge_icon as "badgeIcon",
                            badge_color as "badgeColor", mascot, start_date as "startDate", end_date as "endDate",
                            is_active as "isActive", participants_count as "participantsCount"
                     FROM kids_challenges WHERE is_active = TRUE`;
        const params: any[] = [];

        if (ageGroup) {
            params.push(ageGroup);
            query += ` AND age_group = $${params.length}`;
        }
        if (type && type !== 'all') {
            params.push(type);
            query += ` AND type = $${params.length}`;
        }

        query += ` ORDER BY start_date DESC`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Join a challenge.
     */
    async joinChallenge(userId: string, challengeId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const challengeResult = await client.query(
                `SELECT * FROM kids_challenges WHERE id = $1 AND is_active = TRUE`,
                [challengeId]
            );

            if (challengeResult.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Challenge not found');
            }

            await client.query(
                `UPDATE kids_challenges SET participants_count = participants_count + 1 WHERE id = $1`,
                [challengeId]
            );

            await client.query('COMMIT');
            log.info({ userId, challengeId }, 'Challenge joined');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Stats ──────────────────────────────────────────────────

    /**
     * Get kid's stats.
     */
    async getStats(userId: string): Promise<KidStats> {
        const totalResult = await this.pool.query(
            `SELECT COALESCE(SUM(points_earned), 0) as total_points, COUNT(*) as total_workouts,
                    COALESCE(SUM(duration_minutes), 0) as total_minutes
             FROM kids_activity_logs WHERE user_id = $1`,
            [userId]
        );

        const row = totalResult.rows[0];

        // Get badges
        const badgesResult = await this.pool.query(
            `SELECT id, badge_name as "badgeName", badge_icon as "badgeIcon", badge_color as "badgeColor",
                    created_at as "awardedAt", points_awarded as "pointsAwarded"
             FROM kids_badges WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        // Get weekly activity
        const weeklyResult = await this.pool.query(
            `SELECT DATE(created_at) as day, COALESCE(SUM(duration_minutes), 0) as minutes, COALESCE(SUM(points_earned), 0) as points
             FROM kids_activity_logs
             WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY day ASC`,
            [userId]
        );

        return {
            totalPoints: parseInt(row.total_points, 10),
            totalWorkouts: parseInt(row.total_workouts, 10),
            totalChallenges: badgesResult.rowCount || 0,
            totalMinutes: parseInt(row.total_minutes, 10),
            currentStreak: 0, // Would need proper streak calculation
            longestStreak: 0,
            badges: badgesResult.rows,
            weeklyActivity: weeklyResult.rows,
        };
    }

    // ─── Parent Dashboard ───────────────────────────────────────

    /**
     * Get parent dashboard (kids linked to parent).
     */
    async getParentDashboard(parentId: string): Promise<ParentDashboard> {
        // Get children linked to this parent
        const childrenResult = await this.pool.query(
            `SELECT u.id, u.full_name, u.date_of_birth,
                    CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.date_of_birth)) <= 12 THEN '6-12' ELSE '13-17' END as age_group
             FROM users u
             JOIN parent_child_links pcl ON u.id = pcl.child_id
             WHERE pcl.parent_id = $1 AND u.role = 'trainee'`,
            [parentId]
        );

        const children: ParentDashboard['children'] = [];

        for (const child of childrenResult.rows) {
            const stats = await this.getStats(child.id);
            const recentActivities = await this.pool.query(
                `SELECT id, user_id as "userId", workout_id as "workoutId", challenge_id as "challengeId",
                        activity_type as "activityType", points_earned as "pointsEarned",
                        duration_minutes as "durationMinutes", calories_burned as "caloriesBurned",
                        notes, created_at as "createdAt"
                 FROM kids_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
                [child.id]
            );

            children.push({
                userId: child.id,
                fullName: child.full_name,
                ageGroup: child.age_group,
                totalPoints: stats.totalPoints,
                totalWorkouts: stats.totalWorkouts,
                currentStreak: stats.currentStreak,
                totalMinutes: stats.totalMinutes,
                lastActive: recentActivities.rows[0]?.createdAt || '',
                recentActivities: recentActivities.rows,
                badges: stats.badges,
            });
        }

        return { children };
    }
}
