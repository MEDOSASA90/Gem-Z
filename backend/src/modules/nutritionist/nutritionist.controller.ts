/**
 * GEM Z — Nutritionist Consultation Controller
 *
 * Handles HTTP requests for nutritionist management:
 *   - GET  /api/v1/nutritionists              — List certified nutritionists
 *   - GET  /api/v1/nutritionists/:id          — Get nutritionist profile
 *   - POST /api/v1/nutritionists/book         — Book online session
 *   - GET  /api/v1/nutritionists/sessions     — List my sessions
 *   - PUT  /api/v1/nutritionists/sessions/:id — Update session status
 *   - POST /api/v1/nutritionists/review       — Submit session review
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';
import * as NutritionistService from './nutritionist.service';

const log = createLogger('nutritionist-controller');

export class NutritionistController {
    /**
     * GET /api/v1/nutritionists
     * List certified nutritionists with optional filters.
     */
    static async listNutritionists(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { specialty, language, verified, available, minRating, maxRate, limit, offset } = req.query;

            const result = await NutritionistService.listNutritionists({
                specialty: specialty as string | undefined,
                language: language as string | undefined,
                verified: verified !== undefined ? verified === 'true' : undefined,
                available: available !== undefined ? available === 'true' : undefined,
                minRating: minRating ? parseFloat(minRating as string) : undefined,
                maxRate: maxRate ? parseFloat(maxRate as string) : undefined,
                limit: limit ? parseInt(limit as string) : 20,
                offset: offset ? parseInt(offset as string) : 0,
            });

            res.status(200).json({
                success: true,
                data: result.nutritionists,
                pagination: { total: result.total, limit: limit ? parseInt(limit as string) : 20, offset: offset ? parseInt(offset as string) : 0 },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutritionists/:id
     * Get a single nutritionist profile.
     */
    static async getNutritionist(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const nutritionist = await NutritionistService.getNutritionistById(id);

            res.status(200).json({
                success: true,
                data: nutritionist,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/nutritionists/book
     * Book an online session with a nutritionist.
     */
    static async bookSession(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const clientId = req.user?.userId;
            if (!clientId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { nutritionistId, scheduledAt, durationMinutes, notes, clientGoals } = req.body;

            if (!nutritionistId) {
                throw new ValidationError('nutritionistId is required', ErrorCode.MISSING_FIELD);
            }
            if (!scheduledAt) {
                throw new ValidationError('scheduledAt is required', ErrorCode.MISSING_FIELD);
            }

            const session = await NutritionistService.bookSession(clientId, {
                nutritionistId,
                scheduledAt,
                durationMinutes,
                notes,
                clientGoals,
            });

            res.status(201).json({
                success: true,
                message: 'Session booked successfully',
                session,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutritionists/sessions
     * List sessions for the authenticated user (as client).
     */
    static async listClientSessions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const clientId = req.user?.userId;
            if (!clientId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const status = req.query.status as string | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const result = await NutritionistService.listClientSessions(clientId, status, limit, offset);

            res.status(200).json({
                success: true,
                data: result.sessions,
                pagination: { total: result.total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutritionists/my-sessions
     * List sessions for the authenticated nutritionist.
     */
    static async listNutritionistSessions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const status = req.query.status as string | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const result = await NutritionistService.listNutritionistSessions(userId, status, limit, offset);

            res.status(200).json({
                success: true,
                data: result.sessions,
                pagination: { total: result.total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/nutritionists/sessions/:id
     * Update session status.
     */
    static async updateSessionStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const { status, mealPlanSent, followUpDate, notes } = req.body;

            if (!status) {
                throw new ValidationError('status is required', ErrorCode.MISSING_FIELD);
            }

            const session = await NutritionistService.updateSessionStatus(
                id,
                userId,
                status,
                { mealPlanSent, followUpDate, notes }
            );

            res.status(200).json({
                success: true,
                message: 'Session status updated',
                session,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/nutritionists/review
     * Submit a review/rating for a completed session.
     */
    static async submitReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const clientId = req.user?.userId;
            if (!clientId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { sessionId, rating, review } = req.body;

            if (!sessionId) {
                throw new ValidationError('sessionId is required', ErrorCode.MISSING_FIELD);
            }
            if (rating === undefined || rating < 1 || rating > 5) {
                throw new ValidationError('rating must be between 1 and 5', ErrorCode.INVALID_INPUT);
            }

            await NutritionistService.submitReview(sessionId, clientId, rating, review);

            res.status(200).json({
                success: true,
                message: 'Review submitted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
