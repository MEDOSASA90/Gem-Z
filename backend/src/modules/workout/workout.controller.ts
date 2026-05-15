/**
 * GEM Z — AI Workout Generator Controller
 *
 * Handles AI-powered workout plan generation and management.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { WorkoutService } from './workout.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const workoutService = new WorkoutService(db);
const log = createLogger('workout-controller');

export class WorkoutController {
    /**
     * POST /api/v1/workout/generate
     * Generate a new AI workout plan.
     */
    static async generateWorkoutPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { goal, fitness_level, equipment_available, days_per_week } = req.body;

            log.info({ userId, goal, fitness_level }, 'Generating workout plan');

            const plan = await workoutService.generateWorkoutPlan(userId, {
                goal,
                fitnessLevel: fitness_level,
                equipmentAvailable: equipment_available || [],
                daysPerWeek: days_per_week,
            });

            res.status(201).json(success(plan, 'Workout plan generated'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/workout
     * List all workout plans for the authenticated user.
     */
    static async listWorkoutPlans(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const plans = await workoutService.listWorkoutPlans(userId);
            res.status(200).json(success(plans, 'Workout plans retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/workout/:id
     * Get a specific workout plan with all exercises.
     */
    static async getWorkoutPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const plan = await workoutService.getWorkoutPlan(id, userId);
            res.status(200).json(success(plan, 'Workout plan retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/workout/:id/archive
     * Archive a workout plan.
     */
    static async archiveWorkoutPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await workoutService.archiveWorkoutPlan(id, userId);
            res.status(200).json(success(null, 'Workout plan archived'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/workout/:id
     * Delete a workout plan.
     */
    static async deleteWorkoutPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await workoutService.deleteWorkoutPlan(id, userId);
            res.status(200).json(success(null, 'Workout plan deleted'));
        } catch (error) {
            next(error);
        }
    }
}
