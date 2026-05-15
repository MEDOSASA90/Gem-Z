/**
 * GEM Z — Video Tutorial Controller
 *
 * HTTP handlers for:
 *   - Uploading videos
 *   - Searching and filtering
 *   - Category browsing
 *   - Video streaming
 *   - Like/unlike videos
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
    createVideo,
    updateVideo,
    getVideoById,
    searchVideos,
    deleteVideo,
    toggleLike,
    checkUserLike,
    createTranscodingJob,
    getTranscodingJob,
    getTrendingVideos,
    getRecentVideos,
} from './video.service';
import type { VideoCategory } from './video.service';

const log = createLogger('video:controller');

const CATEGORIES: VideoCategory[] = [
    'workout', 'nutrition', 'technique', 'stretching',
    'motivation', 'education', 'yoga', 'cardio', 'strength', 'hiit',
];

// ─── Validation Rules ───────────────────────────────────────────

const createVideoValidation = [
    body('title')
        .trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters'),
    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
    body('videoUrl')
        .trim().notEmpty().withMessage('Video URL is required')
        .isURL().withMessage('Invalid video URL'),
    body('thumbnailUrl')
        .optional({ checkFalsy: true })
        .isURL().withMessage('Invalid thumbnail URL'),
    body('duration')
        .optional()
        .isInt({ min: 1, max: 7200 }).withMessage('Duration must be between 1 and 7200 seconds')
        .toInt(),
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(CATEGORIES).withMessage('Invalid category'),
    body('tags')
        .optional()
        .isArray({ max: 10 }).withMessage('Maximum 10 tags allowed'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
    body('language')
        .optional()
        .isLength({ max: 10 }).withMessage('Language code too long'),
];

const updateVideoValidation = [
    param('videoId').trim().notEmpty().withMessage('Video ID is required'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 2000 }),
    body('category')
        .optional()
        .isIn(CATEGORIES).withMessage('Invalid category'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced']),
    body('isPublished')
        .optional()
        .isBoolean(),
];

const searchValidation = [
    query('q').optional().trim().isLength({ max: 200 }),
    query('category').optional().isIn(CATEGORIES),
    query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['newest', 'popular', 'duration']),
];

// ─── Controller ─────────────────────────────────────────────────

export class VideoController {
    /**
     * POST /api/v1/videos
     * Create a new video tutorial.
     */
    static async create(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const video = await createVideo({
                title: req.body.title,
                description: req.body.description,
                videoUrl: req.body.videoUrl,
                thumbnailUrl: req.body.thumbnailUrl,
                duration: req.body.duration,
                category: req.body.category,
                tags: req.body.tags,
                trainerId: userId,
                difficulty: req.body.difficulty || 'beginner',
                language: req.body.language || 'en',
            });

            return res.status(201).json({
                success: true,
                message: 'Video tutorial created',
                data: video,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to create video');
            return res.status(500).json({
                success: false,
                message: 'Failed to create video',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * PUT /api/v1/videos/:videoId
     * Update a video tutorial.
     */
    static async update(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { videoId } = req.params;
            const video = await updateVideo(videoId, req.body);

            return res.status(200).json({
                success: true,
                message: 'Video tutorial updated',
                data: video,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to update video');
            return res.status(500).json({
                success: false,
                message: 'Failed to update video',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/videos
     * Search and list videos.
     */
    static async search(req: AuthRequest, res: Response) {
        try {
            const result = await searchVideos({
                query: req.query.q as string | undefined,
                category: req.query.category as VideoCategory | undefined,
                difficulty: req.query.difficulty as string | undefined,
                trainerId: req.query.trainerId as string | undefined,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
                page: Number(req.query.page) || 1,
                limit: Math.min(Number(req.query.limit) || 20, 100),
                sortBy: (req.query.sortBy as 'newest' | 'popular' | 'duration') || 'newest',
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to search videos');
            return res.status(500).json({
                success: false,
                message: 'Failed to search videos',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/videos/:videoId
     * Get a single video by ID.
     */
    static async getById(req: AuthRequest, res: Response) {
        try {
            const { videoId } = req.params;
            const userId = req.user?.userId;

            const video = await getVideoById(videoId, userId);

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found',
                    code: ErrorCode.NOT_FOUND_RESOURCE,
                });
            }

            let liked = false;
            if (userId) {
                liked = await checkUserLike(videoId, userId);
            }

            return res.status(200).json({
                success: true,
                data: { ...video, liked },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get video');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve video',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * DELETE /api/v1/videos/:videoId
     * Delete a video tutorial.
     */
    static async delete(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { videoId } = req.params;
            await deleteVideo(videoId);

            return res.status(200).json({
                success: true,
                message: 'Video deleted',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to delete video');
            return res.status(500).json({
                success: false,
                message: 'Failed to delete video',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/videos/:videoId/like
     * Toggle like on a video.
     */
    static async toggleLike(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { videoId } = req.params;
            const result = await toggleLike(videoId, userId);

            return res.status(200).json({
                success: true,
                message: result.liked ? 'Video liked' : 'Video unliked',
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to toggle like');
            return res.status(500).json({
                success: false,
                message: 'Failed to toggle like',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/videos/trending
     * Get trending videos.
     */
    static async getTrending(req: AuthRequest, res: Response) {
        try {
            const limit = Math.min(Number(req.query.limit) || 10, 50);
            const videos = await getTrendingVideos(limit);

            return res.status(200).json({
                success: true,
                data: videos,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get trending videos');
            return res.status(500).json({
                success: false,
                message: 'Failed to get trending videos',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/videos/recent
     * Get recently added videos.
     */
    static async getRecent(req: AuthRequest, res: Response) {
        try {
            const limit = Math.min(Number(req.query.limit) || 10, 50);
            const videos = await getRecentVideos(limit);

            return res.status(200).json({
                success: true,
                data: videos,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get recent videos');
            return res.status(500).json({
                success: false,
                message: 'Failed to get recent videos',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/videos/:videoId/transcode
     * Start a transcoding job.
     */
    static async startTranscoding(req: AuthRequest, res: Response) {
        try {
            const { videoId } = req.params;
            const { resolution } = req.body;

            const job = await createTranscodingJob(videoId, resolution);

            return res.status(201).json({
                success: true,
                message: 'Transcoding job started',
                data: job,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to start transcoding');
            return res.status(500).json({
                success: false,
                message: 'Failed to start transcoding',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/videos/transcode/:jobId
     * Get transcoding job status.
     */
    static async getTranscodingStatus(req: AuthRequest, res: Response) {
        try {
            const { jobId } = req.params;
            const job = await getTranscodingJob(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Transcoding job not found',
                    code: ErrorCode.NOT_FOUND_RESOURCE,
                });
            }

            return res.status(200).json({
                success: true,
                data: job,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get transcoding status');
            return res.status(500).json({
                success: false,
                message: 'Failed to get transcoding status',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── Validation Middleware Exports ──────────────────────────

    static validations = {
        create: createVideoValidation,
        update: updateVideoValidation,
        search: searchValidation,
    };
}
