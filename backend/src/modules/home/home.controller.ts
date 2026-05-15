/**
 * GEM Z — Home Workout Plans Controller
 *
 * Handles browsing and starting no-equipment home workouts.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { HomeWorkoutService } from './home.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const homeService = new HomeWorkoutService(db);
const log = createLogger('home-workout-controller');

export class HomeWorkoutController {
    /**
     * GET /api/v1/home/workouts
     * List home workouts.
     */
    static async listWorkouts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { difficulty, category, muscle_group } = req.query;
            const workouts = await homeService.listWorkouts({
                difficulty: difficulty as string | undefined,
                category: category as string | undefined,
                muscleGroup: muscle_group as string | undefined,
            });
            res.status(200).json(success(workouts, 'Workouts retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/home/workouts/:id
     * Get workout detail.
     */
    static async getWorkoutDetail(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const workout = await homeService.getWorkoutDetail(id);
            res.status(200).json(success(workout, 'Workout detail retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/home/workouts/:id/start
     * Start a workout session.
     */
    static async startWorkout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            log.info({ userId, workoutId: id }, 'Starting workout');

            const session = await homeService.startSession(userId, id);
            res.status(201).json(success(session, 'Workout started'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/home/workouts/sessions/:id/complete
     * Complete a workout session.
     */
    static async completeWorkout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { duration_seconds, calories_burned, exercises_completed } = req.body;

            const session = await homeService.completeSession(userId, id, {
                durationSeconds: duration_seconds,
                caloriesBurned: calories_burned,
                exercisesCompleted: exercises_completed,
            });

            res.status(200).json(success(session, 'Workout completed'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/home/workouts/sessions
     * Get user's workout sessions.
     */
    static async getSessions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const sessions = await homeService.getUserSessions(userId);
            res.status(200).json(success(sessions, 'Sessions retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/home/workouts/sessions/active
     * Get active workout session.
     */
    static async getActiveSession(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const session = await homeService.getActiveSession(userId);
            res.status(200).json(success(session, 'Active session retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
