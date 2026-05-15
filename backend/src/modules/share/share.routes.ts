/**
 * GEM Z — Social Sharing Routes
 *
 * Routes for generating shareable images and tracking share analytics.
 */

import express from 'express';
import { ShareController } from './share.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams } from '../../core/middlewares/validation.middleware';

const router = express.Router();

// ─── Share Image Generation ─────────────────────────────────────

router.post(
    '/generate',
    authenticate as any,
    validateBody(ShareController.validations.generateImage) as any,
    ShareController.generateImage as any
);

// ─── Platform-Optimized Images ──────────────────────────────────

router.post(
    '/:shareId/platform/:platform',
    authenticate as any,
    validateParams(ShareController.validations.platformImage) as any,
    ShareController.generatePlatformImage as any
);

// ─── Share URL Builder ──────────────────────────────────────────

router.post(
    '/build-url',
    authenticate as any,
    validateBody(ShareController.validations.buildUrl) as any,
    ShareController.buildShareUrl as any
);

// ─── Share Analytics ────────────────────────────────────────────

router.get(
    '/analytics',
    authenticate as any,
    ShareController.getAnalytics as any
);

// ─── Record Share Event ─────────────────────────────────────────

router.post(
    '/:shareId/record',
    validateBody(ShareController.validations.recordShare) as any,
    ShareController.recordShareEvent as any
);

// ─── Get / Delete Share ─────────────────────────────────────────

router.get(
    '/:shareId',
    ShareController.getShare as any
);

router.delete(
    '/:shareId',
    authenticate as any,
    ShareController.deleteShare as any
);

export default router;
