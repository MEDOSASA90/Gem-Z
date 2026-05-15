/**
 * GEM Z — MediaPipe Routes
 *
 * Routes:
 *   POST /api/v1/mediapipe/analyze       — Analyze form from pose landmarks
 *   GET  /api/v1/mediapipe/history/list  — List user's analysis history
 *   GET  /api/v1/mediapipe/progress/me   — Get progress analytics
 *   GET  /api/v1/mediapipe/:id           — Get analysis result by ID
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { MediapipeController } from './mediapipe.controller';

const router = express.Router();

const VALID_EXERCISES = ['squat', 'deadlift', 'bench_press', 'overhead_press', 'pull_up', 'push_up', 'lunge', 'plank'];

// ─── Form Analysis ──────────────────────────────────────────────

router.post(
    '/analyze',
    authenticate as any,
    validateBody([
        body('exerciseType')
            .trim()
            .notEmpty()
            .withMessage('exerciseType is required')
            .isIn(VALID_EXERCISES)
            .withMessage(`exerciseType must be one of: ${VALID_EXERCISES.join(', ')}`),
        body('poseFrames')
            .isArray({ min: 1 })
            .withMessage('poseFrames must be a non-empty array')
            .custom((frames: any[]) => {
                return frames.every(
                    (f) =>
                        typeof f.timestamp === 'number' &&
                        Array.isArray(f.landmarks) &&
                        f.landmarks.length >= 33
                );
            })
            .withMessage('Each frame must have timestamp and at least 33 landmarks'),
        body('videoUrl').optional().trim().isURL().withMessage('videoUrl must be a valid URL'),
        body('userWeight').optional().isFloat({ min: 20, max: 300 }).withMessage('userWeight must be between 20 and 300 kg'),
        body('userHeight').optional().isFloat({ min: 50, max: 300 }).withMessage('userHeight must be between 50 and 300 cm'),
    ]),
    MediapipeController.analyzeForm as any
);

// ─── Analysis Retrieval ─────────────────────────────────────────

router.get(
    '/history/list',
    authenticate as any,
    validateQuery([
        query('exerciseType')
            .optional()
            .trim()
            .isIn(VALID_EXERCISES)
            .withMessage(`exerciseType must be one of: ${VALID_EXERCISES.join(', ')}`),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt(),
    ]),
    MediapipeController.listHistory as any
);

router.get(
    '/progress/me',
    authenticate as any,
    MediapipeController.getProgress as any
);

router.get(
    '/:id',
    authenticate as any,
    validateParams([
        param('id').trim().notEmpty().withMessage('Analysis ID is required').isUUID().withMessage('Invalid analysis ID'),
    ]),
    MediapipeController.getAnalysis as any
);

export default router;
