/**
 * GEM Z — Nutrition Scanner Controller
 *
 * Handles HTTP requests for food photo nutrition analysis:
 *   - POST /api/v1/nutrition/scan         — Scan food photo
 *   - GET  /api/v1/nutrition/history      — List scan history
 *   - GET  /api/v1/nutrition/daily        — Get daily nutrition summary
 *   - GET  /api/v1/nutrition/trends       — Get nutrition trends
 *   - GET  /api/v1/nutrition/:id          — Get single scan details
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import * as NutritionService from './nutrition.service';

const log = createLogger('nutrition-controller');

export class NutritionController {
    /**
     * POST /api/v1/nutrition/scan
     * Scan a food photo and get nutritional analysis.
     */
    static async scanFood(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { imageUrl, userNotes, mealType } = req.body;

            if (!imageUrl) {
                throw new ValidationError('imageUrl is required', ErrorCode.MISSING_FIELD);
            }

            const result = await NutritionService.scanFood(userId, {
                imageUrl,
                userNotes,
                mealType,
            });

            res.status(201).json({
                success: true,
                message: 'Food analysis complete',
                scan: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutrition/history
     * List scan history for the authenticated user.
     */
    static async listHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
            const mealType = req.query.mealType as string | undefined;

            const { scans, total } = await NutritionService.listScans(userId, limit, offset, mealType);

            res.status(200).json({
                success: true,
                data: scans,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutrition/daily
     * Get daily nutrition summary.
     */
    static async getDailyNutrition(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const date = req.query.date as string | undefined;
            const daily = await NutritionService.getDailyNutrition(userId, date);

            res.status(200).json({
                success: true,
                data: daily,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutrition/trends
     * Get nutrition trends over time.
     */
    static async getTrends(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const trends = await NutritionService.getNutritionTrends(userId, days);

            res.status(200).json({
                success: true,
                data: trends,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/nutrition/:id
     * Get a single scan by ID.
     */
    static async getScan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const scan = await NutritionService.getScanById(id);

            if (scan.userId !== userId) {
                throw new ValidationError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            res.status(200).json({
                success: true,
                data: scan,
            });
        } catch (error) {
            next(error);
        }
    }
}
