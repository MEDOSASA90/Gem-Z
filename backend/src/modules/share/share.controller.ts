/**
 * GEM Z — Social Sharing Controller
 *
 * HTTP handlers for:
 *   - Generating shareable achievement images
 *   - Creating platform-optimized share images
 *   - Recording share events for analytics
 *   - Retrieving share analytics
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
    generateShareImage,
    generatePlatformImage,
    recordShare,
    getUserShareAnalytics,
    getShareLink,
    deleteShareLink,
    buildShareUrl,
    Platform,
} from './share.service';

const log = createLogger('share:controller');

// ─── Validation Rules ───────────────────────────────────────────

const generateImageValidation = [
    body('type')
        .notEmpty().withMessage('Share type is required')
        .isIn(['achievement', 'workout', 'progress', 'challenge']).withMessage('Invalid share type'),
    body('title')
        .trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters'),
    body('subtitle')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 300 }).withMessage('Subtitle must not exceed 300 characters'),
    body('metric')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('Metric must not exceed 50 characters'),
    body('metricLabel')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 }).withMessage('Metric label must not exceed 100 characters'),
    body('gradient')
        .optional()
        .isIn(['gold', 'purple', 'blue', 'green', 'red', 'orange', 'neon', 'dark'])
        .withMessage('Invalid gradient preset'),
];

const platformImageValidation = [
    param('shareId').trim().notEmpty().withMessage('Share ID is required'),
    param('platform')
        .notEmpty().withMessage('Platform is required')
        .isIn(['facebook', 'instagram', 'tiktok', 'whatsapp', 'twitter', 'copy'])
        .withMessage('Invalid platform'),
];

const recordShareValidation = [
    param('shareId').trim().notEmpty().withMessage('Share ID is required'),
    body('platform')
        .notEmpty().withMessage('Platform is required')
        .isIn(['facebook', 'instagram', 'tiktok', 'whatsapp', 'twitter', 'copy'])
        .withMessage('Invalid platform'),
];

const buildUrlValidation = [
    body('platform')
        .notEmpty().withMessage('Platform is required')
        .isIn(['facebook', 'instagram', 'tiktok', 'whatsapp', 'twitter', 'copy'])
        .withMessage('Invalid platform'),
    body('title').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('url').optional().trim().isURL().withMessage('Invalid URL'),
];

// ─── Controller ─────────────────────────────────────────────────

export class ShareController {
    /**
     * POST /api/v1/shares/generate
     * Generate a shareable OG image for an achievement or milestone.
     */
    static async generateImage(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { type, title, subtitle, metric, metricLabel, gradient } = req.body;

            const result = await generateShareImage(
                userId,
                type,
                title,
                subtitle,
                metric,
                metricLabel,
                gradient || 'neon'
            );

            log.info({ userId, type, shareUrl: result.url }, 'Share image generated');

            return res.status(201).json({
                success: true,
                message: 'Share image generated successfully',
                data: {
                    imageUrl: result.url,
                    width: result.width,
                    height: result.height,
                    sizeBytes: result.sizeBytes,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to generate share image');
            return res.status(500).json({
                success: false,
                message: 'Failed to generate share image',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/shares/:shareId/platform/:platform
     * Generate a platform-optimized share image.
     */
    static async generatePlatformImage(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { shareId, platform } = req.params;
            const result = await generatePlatformImage(shareId, platform as Platform);

            log.info({ userId, shareId, platform, url: result.url }, 'Platform image generated');

            return res.status(200).json({
                success: true,
                message: `Platform image for ${platform} generated`,
                data: {
                    imageUrl: result.url,
                    width: result.width,
                    height: result.height,
                    sizeBytes: result.sizeBytes,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to generate platform image');
            return res.status(500).json({
                success: false,
                message: 'Failed to generate platform image',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/shares/:shareId/record
     * Record a share event for analytics.
     */
    static async recordShareEvent(req: AuthRequest, res: Response) {
        try {
            const { shareId } = req.params;
            const { platform } = req.body;
            const ipAddress = req.ip;

            await recordShare(shareId, platform as Platform, ipAddress);

            log.info({ shareId, platform, ip: ipAddress }, 'Share event recorded');

            return res.status(200).json({
                success: true,
                message: 'Share recorded successfully',
            });
        } catch (error) {
            log.error({ error: (error as Error).message, shareId: req.params.shareId }, 'Failed to record share');
            return res.status(500).json({
                success: false,
                message: 'Failed to record share event',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/shares/analytics
     * Get share analytics for the authenticated user.
     */
    static async getAnalytics(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const analytics = await getUserShareAnalytics(userId);

            return res.status(200).json({
                success: true,
                data: analytics,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get analytics');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve analytics',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/shares/:shareId
     * Get a share link by ID.
     */
    static async getShare(req: AuthRequest, res: Response) {
        try {
            const { shareId } = req.params;
            const share = await getShareLink(shareId);

            return res.status(200).json({
                success: true,
                data: share,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get share link');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve share link',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * DELETE /api/v1/shares/:shareId
     * Delete a share link.
     */
    static async deleteShare(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { shareId } = req.params;
            await deleteShareLink(shareId, userId);

            log.info({ shareId, userId }, 'Share link deleted');

            return res.status(200).json({
                success: true,
                message: 'Share link deleted successfully',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to delete share link');
            return res.status(500).json({
                success: false,
                message: 'Failed to delete share link',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/shares/build-url
     * Build a native share URL for a given platform.
     */
    static async buildShareUrl(req: AuthRequest, res: Response) {
        try {
            const { platform, title, description, url } = req.body;

            const shareUrl = buildShareUrl({ platform, title, description, url });

            return res.status(200).json({
                success: true,
                data: { shareUrl, platform },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to build share URL');
            return res.status(500).json({
                success: false,
                message: 'Failed to build share URL',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── Validation Middleware Exports ──────────────────────────

    static validations = {
        generateImage: generateImageValidation,
        platformImage: platformImageValidation,
        recordShare: recordShareValidation,
        buildUrl: buildUrlValidation,
    };
}
