/**
 * GEM Z — AR Workout Controller
 *
 * HTTP handlers for:
 *   - 3D model data for AR exercises
 *   - AR session management
 *   - Model browsing and search
 */

import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
    buildErrorResponse,
} from '../../core/errors';
import {
    createARModel,
    updateARModel,
    getARModelById,
    searchARModels,
    getExerciseData,
    deleteARModel,
    startARSession,
    completeARSession,
    getARSessionHistory,
    getARStats,
} from './ar.service';
import type { ARModelFormat } from './ar.service';

const log = createLogger('ar:controller');

const SUPPORTED_FORMATS: ARModelFormat[] = ['glb', 'gltf', 'usdz', 'fbx', 'obj'];
const BODY_PARTS = [
    'chest', 'back', 'legs', 'arms', 'shoulders',
    'abs', 'core', 'full_body', 'cardio', 'flexibility',
];

// ─── Validation Rules ───────────────────────────────────────────

const createModelValidation = [
    body('name')
        .trim().notEmpty().withMessage('Model name is required')
        .isLength({ max: 200 }).withMessage('Name too long'),
    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 2000 }),
    body('modelUrl')
        .trim().notEmpty().withMessage('Model URL is required')
        .isURL().withMessage('Invalid model URL'),
    body('thumbnailUrl')
        .optional({ checkFalsy: true })
        .isURL(),
    body('format')
        .notEmpty().withMessage('Format is required')
        .isIn(SUPPORTED_FORMATS).withMessage(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`),
    body('fileSizeBytes')
        .notEmpty().withMessage('File size is required')
        .isInt({ min: 1 }).withMessage('File size must be positive')
        .toInt(),
    body('polygonCount').optional().isInt({ min: 1 }).toInt(),
    body('animationCount').optional().isInt({ min: 0 }).toInt(),
    body('exerciseId').optional({ checkFalsy: true }).isUUID(),
    body('bodyPart').optional().isIn(BODY_PARTS),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
];

const updateModelValidation = [
    param('modelId').trim().notEmpty().withMessage('Model ID is required'),
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional({ checkFalsy: true }).trim(),
    body('isActive').optional().isBoolean(),
    body('bodyPart').optional().isIn(BODY_PARTS),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
];

const searchValidation = [
    query('bodyPart').optional().isIn(BODY_PARTS),
    query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('format').optional().isIn(SUPPORTED_FORMATS),
    query('exerciseId').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const sessionValidation = [
    body('modelId').trim().notEmpty().withMessage('Model ID is required').isUUID(),
];

const completeSessionValidation = [
    param('sessionId').trim().notEmpty().withMessage('Session ID is required'),
    body('durationSeconds').optional().isInt({ min: 1 }).toInt(),
    body('caloriesBurned').optional().isFloat({ min: 0 }).toFloat(),
];

// ─── Controller ─────────────────────────────────────────────────

export class ARController {
    /**
     * POST /api/v1/ar/models
     * Create a new AR model.
     */
    static async createModel(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const model = await createARModel({
                name: req.body.name,
                description: req.body.description,
                modelUrl: req.body.modelUrl,
                thumbnailUrl: req.body.thumbnailUrl,
                format: req.body.format,
                fileSizeBytes: req.body.fileSizeBytes,
                polygonCount: req.body.polygonCount,
                animationCount: req.body.animationCount,
                exerciseId: req.body.exerciseId,
                bodyPart: req.body.bodyPart,
                difficulty: req.body.difficulty || 'beginner',
                metadata: req.body.metadata,
            });

            return res.status(201).json({
                success: true,
                message: 'AR model created',
                data: model,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to create AR model');
            return res.status(500).json({
                success: false,
                message: 'Failed to create AR model',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * PUT /api/v1/ar/models/:modelId
     * Update an AR model.
     */
    static async updateModel(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { modelId } = req.params;
            const model = await updateARModel(modelId, req.body);

            return res.status(200).json({
                success: true,
                message: 'AR model updated',
                data: model,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to update AR model');
            return res.status(500).json({
                success: false,
                message: 'Failed to update AR model',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/ar/models
     * Search and list AR models.
     */
    static async searchModels(req: AuthRequest, res: Response) {
        try {
            const result = await searchARModels({
                bodyPart: req.query.bodyPart as string | undefined,
                difficulty: req.query.difficulty as string | undefined,
                format: req.query.format as ARModelFormat | undefined,
                exerciseId: req.query.exerciseId as string | undefined,
                page: Number(req.query.page) || 1,
                limit: Math.min(Number(req.query.limit) || 20, 100),
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to search AR models');
            return res.status(500).json({
                success: false,
                message: 'Failed to search AR models',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/ar/models/:modelId
     * Get a single AR model.
     */
    static async getModel(req: AuthRequest, res: Response) {
        try {
            const { modelId } = req.params;
            const model = await getARModelById(modelId);

            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'AR model not found',
                    code: ErrorCode.NOT_FOUND_RESOURCE,
                });
            }

            return res.status(200).json({
                success: true,
                data: model,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get AR model');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve AR model',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * DELETE /api/v1/ar/models/:modelId
     * Delete an AR model.
     */
    static async deleteModel(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { modelId } = req.params;
            await deleteARModel(modelId);

            return res.status(200).json({
                success: true,
                message: 'AR model deleted',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to delete AR model');
            return res.status(500).json({
                success: false,
                message: 'Failed to delete AR model',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/ar/models/:modelId/exercise
     * Get exercise data with AR model.
     */
    static async getExerciseData(req: AuthRequest, res: Response) {
        try {
            const { modelId } = req.params;
            const data = await getExerciseData(modelId);

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Exercise data not found',
                    code: ErrorCode.NOT_FOUND_RESOURCE,
                });
            }

            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get exercise data');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve exercise data',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── AR Sessions ──────────────────────────────────────────────

    /**
     * POST /api/v1/ar/sessions
     * Start an AR workout session.
     */
    static async startSession(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { modelId } = req.body;
            const session = await startARSession(userId, modelId);

            return res.status(201).json({
                success: true,
                message: 'AR session started',
                data: session,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to start AR session');
            return res.status(500).json({
                success: false,
                message: 'Failed to start AR session',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/ar/sessions/:sessionId/complete
     * Complete an AR workout session.
     */
    static async completeSession(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { sessionId } = req.params;
            const { durationSeconds, caloriesBurned } = req.body;

            const session = await completeARSession(sessionId, userId, durationSeconds, caloriesBurned);

            return res.status(200).json({
                success: true,
                message: 'AR session completed',
                data: session,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to complete AR session');
            return res.status(500).json({
                success: false,
                message: 'Failed to complete AR session',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/ar/sessions
     * Get AR session history.
     */
    static async getSessionHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const page = Number(req.query.page) || 1;
            const limit = Math.min(Number(req.query.limit) || 20, 100);

            const result = await getARSessionHistory(userId, page, limit);

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get session history');
            return res.status(500).json({
                success: false,
                message: 'Failed to get session history',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/ar/stats
     * Get AR system statistics.
     */
    static async getStats(req: AuthRequest, res: Response) {
        try {
            const stats = await getARStats();

            return res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            log.error({ error: (error as Error).message }, 'Failed to get AR stats');
            return res.status(500).json({
                success: false,
                message: 'Failed to get AR stats',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── Validation Middleware Exports ──────────────────────────

    static validations = {
        createModel: createModelValidation,
        updateModel: updateModelValidation,
        search: searchValidation,
        startSession: sessionValidation,
        completeSession: completeSessionValidation,
    };
}
