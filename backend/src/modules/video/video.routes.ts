/**
 * GEM Z — Video Tutorial Routes
 *
 * Routes for video library management:
 *   - Upload videos
 *   - Search and categories
 *   - Video player / streaming
 *   - Like/unlike
 */

import express from 'express';
import { VideoController } from './video.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';

const router = express.Router();

// ─── Video CRUD ─────────────────────────────────────────────────

router.post(
    '/',
    authenticate as any,
    validateBody(VideoController.validations.create) as any,
    VideoController.create as any
);

router.put(
    '/:videoId',
    authenticate as any,
    validateBody(VideoController.validations.update) as any,
    VideoController.update as any
);

router.delete(
    '/:videoId',
    authenticate as any,
    VideoController.delete as any
);

// ─── Search & Browse ────────────────────────────────────────────

router.get(
    '/',
    validateQuery(VideoController.validations.search) as any,
    VideoController.search as any
);

router.get(
    '/trending',
    VideoController.getTrending as any
);

router.get(
    '/recent',
    VideoController.getRecent as any
);

// ─── Single Video ───────────────────────────────────────────────

router.get(
    '/:videoId',
    VideoController.getById as any
);

// ─── Likes ──────────────────────────────────────────────────────

router.post(
    '/:videoId/like',
    authenticate as any,
    VideoController.toggleLike as any
);

// ─── Transcoding ────────────────────────────────────────────────

router.post(
    '/:videoId/transcode',
    authenticate as any,
    VideoController.startTranscoding as any
);

router.get(
    '/transcode/:jobId',
    authenticate as any,
    VideoController.getTranscodingStatus as any
);

export default router;
