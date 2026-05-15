/**
 * GEM Z — MediaPipe Controller
 *
 * Handles HTTP requests for AI-powered exercise form analysis:
 *   - POST /api/v1/mediapipe/analyze       — Analyze form from pose landmarks
 *   - GET  /api/v1/mediapipe/:id           — Get analysis result by ID
 *   - GET  /api/v1/mediapipe/history/list  — List user's analysis history
 *   - GET  /api/v1/mediapipe/progress/me   — Get progress analytics
 */

import { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import * as MediapipeService from './mediapipe.service';

const log = createLogger('mediapipe-controller');

export class MediapipeController {
    /**
     * POST /api/v1/mediapipe/analyze
     * Analyze exercise form from pose landmarks submitted by the client.
     */
    static async analyzeForm(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { exerciseType, poseFrames, videoUrl, userWeight, userHeight } = req.body;

            const result = await MediapipeService.analyzeForm(userId, {
                exerciseType,
                poseFrames,
                videoUrl,
                userWeight,
                userHeight,
            });

            res.status(201).json({
                success: true,
                message: 'Form analysis complete',
                analysis: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/mediapipe/:id
     * Get a single analysis result by ID.
     */
    static async getAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const analysis = await MediapipeService.getAnalysisById(id);

            // Ensure user can only access their own analyses
            if (analysis.userId !== userId) {
                throw new ValidationError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            res.status(200).json({
                success: true,
                analysis,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/mediapipe/history/list
     * List the authenticated user's analysis history.
     */
    static async listHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const exerciseType = req.query.exerciseType as MediapipeService.ExerciseType | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { analyses, total } = await MediapipeService.listAnalyses({
                userId,
                exerciseType,
                limit,
                offset,
            });

            res.status(200).json({
                success: true,
                data: analyses,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/mediapipe/progress/me
     * Get progress analytics for the authenticated user.
     */
    static async getProgress(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const analytics = await MediapipeService.getProgressAnalytics(userId);

            res.status(200).json({
                success: true,
                data: analytics,
            });
        } catch (error) {
            next(error);
        }
    }
}
