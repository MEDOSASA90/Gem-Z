/**
 * GEM Z — Home Workout Plans Service
 *
 * Business logic for no-equipment home workouts:
 * - Browse bodyweight workouts by difficulty
 * - View workout details with exercises
 * - Track workout sessions
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

const log = createLogger('home-workout-service');

// ─── Types ──────────────────────────────────────────────────────

export interface HomeWorkout {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    durationMinutes: number;
    category: string;
    calorieBurnEstimate: number | null;
    imageUrl: string | null;
    videoUrl: string | null;
    equipmentNeeded: string[];
    muscleGroups: string[];
    isActive: boolean;
    createdAt: Date;
}

export interface HomeWorkoutExercise {
    id: string;
    workoutId: string;
    name: string;
    description: string | null;
    durationSeconds: number | null;
    reps: string | null;
    sets: number | null;
    restSeconds: number | null;
    orderIndex: number;
    imageUrl: string | null;
    createdAt: Date;
}

export interface HomeWorkoutSession {
    id: string;
    userId: string;
    workoutId: string;
    startedAt: Date;
    completedAt: Date | null;
    durationSeconds: number | null;
    caloriesBurned: number | null;
    exercisesCompleted: number | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    createdAt: Date;
}

export interface HomeWorkoutDetail extends HomeWorkout {
    exercises: HomeWorkoutExercise[];
}

// ─── Service ────────────────────────────────────────────────────

export class HomeWorkoutService {
    constructor(private pool: Pool) {}

    // ─── List Workouts ────────────────────────────────────────

    async listWorkouts(filters?: { difficulty?: string; category?: string; muscleGroup?: string }): Promise<HomeWorkout[]> {
        let query = `
            SELECT
                id, title, description, difficulty, duration_minutes as "durationMinutes",
                category, calorie_burn_estimate as "calorieBurnEstimate",
                image_url as "imageUrl", video_url as "videoUrl",
                equipment_needed as "equipmentNeeded", muscle_groups as "muscleGroups",
                is_active as "isActive", created_at as "createdAt"
            FROM home_workouts
            WHERE is_active = true
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (filters?.difficulty) {
            query += ` AND difficulty = $${paramIdx}`;
            params.push(filters.difficulty.toLowerCase());
            paramIdx++;
        }

        if (filters?.category) {
            query += ` AND category = $${paramIdx}`;
            params.push(filters.category.toLowerCase());
            paramIdx++;
        }

        if (filters?.muscleGroup) {
            query += ` AND $${paramIdx} = ANY(muscle_groups)`;
            params.push(filters.muscleGroup.toLowerCase());
            paramIdx++;
        }

        query += ` ORDER BY difficulty, duration_minutes, title`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    // ─── Get Workout Detail ───────────────────────────────────

    async getWorkoutDetail(workoutId: string): Promise<HomeWorkoutDetail> {
        const workoutResult = await this.pool.query(
            `
            SELECT
                id, title, description, difficulty, duration_minutes as "durationMinutes",
                category, calorie_burn_estimate as "calorieBurnEstimate",
                image_url as "imageUrl", video_url as "videoUrl",
                equipment_needed as "equipmentNeeded", muscle_groups as "muscleGroups",
                is_active as "isActive", created_at as "createdAt"
            FROM home_workouts
            WHERE id = $1 AND is_active = true
            `,
            [workoutId]
        );

        if (workoutResult.rows.length === 0) {
            throw new NotFoundError('Workout not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const exercisesResult = await this.pool.query(
            `
            SELECT
                id, workout_id as "workoutId", name, description,
                duration_seconds as "durationSeconds", reps, sets,
                rest_seconds as "restSeconds", order_index as "orderIndex",
                image_url as "imageUrl", created_at as "createdAt"
            FROM home_workout_exercises
            WHERE workout_id = $1
            ORDER BY order_index
            `,
            [workoutId]
        );

        return {
            ...workoutResult.rows[0],
            exercises: exercisesResult.rows,
        };
    }

    // ─── Start Workout Session ────────────────────────────────

    async startSession(userId: string, workoutId: string): Promise<HomeWorkoutSession> {
        // Verify workout exists
        const workoutCheck = await this.pool.query(
            'SELECT id FROM home_workouts WHERE id = $1 AND is_active = true',
            [workoutId]
        );
        if (workoutCheck.rows.length === 0) {
            throw new NotFoundError('Workout not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        // Check if user already has an in-progress session
        const existingSession = await this.pool.query(
            `
            SELECT id FROM home_workout_sessions
            WHERE user_id = $1 AND status = 'in_progress'
            ORDER BY started_at DESC
            LIMIT 1
            `,
            [userId]
        );

        // Mark old session as abandoned
        if (existingSession.rows.length > 0) {
            await this.pool.query(
                `UPDATE home_workout_sessions SET status = 'abandoned' WHERE id = $1`,
                [existingSession.rows[0].id]
            );
        }

        const result = await this.pool.query(
            `
            INSERT INTO home_workout_sessions (id, user_id, workout_id, status)
            VALUES ($1, $2, $3, 'in_progress')
            RETURNING
                id, user_id as "userId", workout_id as "workoutId",
                started_at as "startedAt", completed_at as "completedAt",
                duration_seconds as "durationSeconds", calories_burned as "caloriesBurned",
                exercises_completed as "exercisesCompleted", status,
                created_at as "createdAt"
            `,
            [uuidv4(), userId, workoutId]
        );

        log.info({ sessionId: result.rows[0].id, userId, workoutId }, 'Workout session started');
        return result.rows[0];
    }

    // ─── Complete Workout Session ─────────────────────────────

    async completeSession(
        userId: string,
        sessionId: string,
        data: { durationSeconds?: number; caloriesBurned?: number; exercisesCompleted?: number }
    ): Promise<HomeWorkoutSession> {
        const result = await this.pool.query(
            `
            UPDATE home_workout_sessions
            SET
                status = 'completed',
                completed_at = NOW(),
                duration_seconds = COALESCE($1, duration_seconds),
                calories_burned = COALESCE($2, calories_burned),
                exercises_completed = COALESCE($3, exercises_completed)
            WHERE id = $4 AND user_id = $5 AND status = 'in_progress'
            RETURNING
                id, user_id as "userId", workout_id as "workoutId",
                started_at as "startedAt", completed_at as "completedAt",
                duration_seconds as "durationSeconds", calories_burned as "caloriesBurned",
                exercises_completed as "exercisesCompleted", status,
                created_at as "createdAt"
            `,
            [
                data.durationSeconds || null,
                data.caloriesBurned || null,
                data.exercisesCompleted || null,
                sessionId,
                userId,
            ]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Active session not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ sessionId, userId }, 'Workout session completed');
        return result.rows[0];
    }

    // ─── Get User Sessions ────────────────────────────────────

    async getUserSessions(userId: string): Promise<(HomeWorkoutSession & { workoutTitle: string })[]> {
        const result = await this.pool.query(
            `
            SELECT
                hws.id, hws.user_id as "userId", hws.workout_id as "workoutId",
                hw.title as "workoutTitle",
                hws.started_at as "startedAt", hws.completed_at as "completedAt",
                hws.duration_seconds as "durationSeconds", hws.calories_burned as "caloriesBurned",
                hws.exercises_completed as "exercisesCompleted", hws.status,
                hws.created_at as "createdAt"
            FROM home_workout_sessions hws
            JOIN home_workouts hw ON hws.workout_id = hw.id
            WHERE hws.user_id = $1
            ORDER BY hws.started_at DESC
            LIMIT 100
            `,
            [userId]
        );

        return result.rows;
    }

    // ─── Get Active Session ───────────────────────────────────

    async getActiveSession(userId: string): Promise<(HomeWorkoutSession & { workoutTitle: string; difficulty: string }) | null> {
        const result = await this.pool.query(
            `
            SELECT
                hws.id, hws.user_id as "userId", hws.workout_id as "workoutId",
                hw.title as "workoutTitle", hw.difficulty,
                hws.started_at as "startedAt", hws.completed_at as "completedAt",
                hws.duration_seconds as "durationSeconds", hws.calories_burned as "caloriesBurned",
                hws.exercises_completed as "exercisesCompleted", hws.status,
                hws.created_at as "createdAt"
            FROM home_workout_sessions hws
            JOIN home_workouts hw ON hws.workout_id = hw.id
            WHERE hws.user_id = $1 AND hws.status = 'in_progress'
            ORDER BY hws.started_at DESC
            LIMIT 1
            `,
            [userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }
}
