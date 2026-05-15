/**
 * GEM Z — Body Scan 3D Routes
 *
 * Routes:
 *   POST /api/v1/bodyscan/upload   — Upload body photos for AI analysis
 *   GET  /api/v1/bodyscan/history  — List scan history
 *   GET  /api/v1/bodyscan/progress — Get measurement progress over time
 *   GET  /api/v1/bodyscan/:id      — Get single scan details
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { BodyScanController } from './bodyscan.controller';

const router = express.Router();

// ─── Upload & Analyze ───────────────────────────────────────────

router.post('/upload', authenticate as any, validateBody([
    body('frontPhotoUrl')
        .trim()
        .notEmpty()
        .withMessage('frontPhotoUrl is required')
        .isURL()
        .withMessage('frontPhotoUrl must be a valid URL'),
    body('sidePhotoUrl')
        .optional()
        .trim()
        .isURL()
        .withMessage('sidePhotoUrl must be a valid URL'),
    body('backPhotoUrl')
        .optional()
        .trim()
        .isURL()
        .withMessage('backPhotoUrl must be a valid URL'),
]), BodyScanController.uploadPhotos as any);

// ─── Retrieval ──────────────────────────────────────────────────

router.get('/history', authenticate as any, validateQuery([
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), BodyScanController.listHistory as any);

router.get('/progress', authenticate as any, BodyScanController.getProgress as any);

router.get('/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Scan ID is required').isUUID(),
]), BodyScanController.getScan as any);

export default router;
