/**
 * GEM Z — Kid Fitness Controller
 *
 * Handles kid-friendly workouts, challenges, and parent dashboard.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { KidsService } from './kids.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const kidsService = new KidsService(db);
const log = createLogger('kids-controller');

export class KidsController {
    /**
     * GET /api/v1/kids/workouts
     * List age-appropriate workouts.
     */
    static async getWorkouts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { ageGroup, category, difficulty } = req.query;
            const workouts = await kidsService.getWorkouts(
                ageGroup as any,
                category as string | undefined,
                difficulty as string | undefined
            );
            res.status(200).json(success(workouts, 'Workouts retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/kids/workouts/:id
     * Get a single workout.
     */
    static async getWorkout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const workout = await kidsService.getWorkout(id);
            res.status(200).json(success(workout, 'Workout retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/kids/workouts/:id/complete
     * Log a completed workout.
     */
    static async completeWorkout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { durationMinutes } = req.body;
            const result = await kidsService.logWorkout(userId, id, durationMinutes);
            res.status(200).json(success(result, `Workout complete! +${result.pointsEarned} points`));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/kids/challenges
     * List kid-friendly challenges.
     */
    static async getChallenges(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { ageGroup, type } = req.query;
            const challenges = await kidsService.getChallenges(ageGroup as any, type as string | undefined);
            res.status(200).json(success(challenges, 'Challenges retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/kids/challenges/:id/join
     * Join a challenge.
     */
    static async joinChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await kidsService.joinChallenge(userId, id);
            res.status(200).json(success(null, 'Challenge joined!'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/kids/stats
     * Get kid's stats.
     */
    static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const stats = await kidsService.getStats(userId);
            res.status(200).json(success(stats, 'Stats retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/kids/parent-dashboard
     * Get parent view of child's activity.
     */
    static async getParentDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const parentId = req.user!.userId;
            const dashboard = await kidsService.getParentDashboard(parentId);
            res.status(200).json(success(dashboard, 'Parent dashboard retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
