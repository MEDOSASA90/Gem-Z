/**
 * GEM Z — Community Challenges Routes
 *
 * Routes:
 *   POST   /api/v1/community/challenges           — Create challenge
 *   GET    /api/v1/community/challenges           — List challenges
 *   GET    /api/v1/community/challenges/:id       — Get challenge details
 *   POST   /api/v1/community/challenges/:id/join  — Join challenge
 *   POST   /api/v1/community/challenges/:id/leave — Leave challenge
 *   POST   /api/v1/community/challenges/:id/progress — Update progress
 *   DELETE /api/v1/community/challenges/:id       — Delete challenge
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { CommunityController } from './community.controller';
import { ValidationError, ErrorCode } from '../../core/errors';

const router = express.Router();

const auth = authenticate as any;

// ─── Validation Helper ──────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            const fields: Record<string, string> = {};
            errors.array().forEach((err: any) => {
                fields[err.path || err.param] = err.msg;
            });
            return next(new ValidationError('Validation failed', ErrorCode.VALIDATION_ERROR, fields));
        }
        next();
    };
};

// ─── Routes ─────────────────────────────────────────────────────

router.post(
    '/challenges',
    auth,
    validate([
        body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title required, max 200 chars'),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('challengeType').isIn(['steps', 'distance', 'calories', 'workouts', 'water', 'sleep', 'custom']).withMessage('Invalid challenge type'),
        body('targetValue').isFloat({ min: 0.1 }).withMessage('Target value must be > 0'),
        body('unit').trim().notEmpty().isLength({ max: 50 }).withMessage('Unit required'),
        body('startDate').isISO8601().withMessage('Valid start date required'),
        body('endDate').isISO8601().withMessage('Valid end date required'),
        body('isPublic').optional().isBoolean(),
        body('maxParticipants').optional().isInt({ min: 1, max: 10000 }),
        body('reward').optional().trim().isLength({ max: 500 }),
    ]),
    CommunityController.createChallenge
);

router.get(
    '/challenges',
    auth,
    validate([
        query('status').optional().isIn(['upcoming', 'active', 'completed', 'cancelled']),
        query('type').optional().isIn(['steps', 'distance', 'calories', 'workouts', 'water', 'sleep', 'custom']),
        query('mine').optional().isBoolean(),
    ]),
    CommunityController.listChallenges
);

router.get(
    '/challenges/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid challenge ID'),
    ]),
    CommunityController.getChallenge
);

router.post(
    '/challenges/:id/join',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid challenge ID'),
    ]),
    CommunityController.joinChallenge
);

router.post(
    '/challenges/:id/leave',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid challenge ID'),
    ]),
    CommunityController.leaveChallenge
);

router.post(
    '/challenges/:id/progress',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid challenge ID'),
        body('progress').isFloat({ min: 0 }).withMessage('Progress must be >= 0'),
    ]),
    CommunityController.updateProgress
);

router.delete(
    '/challenges/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid challenge ID'),
    ]),
    CommunityController.deleteChallenge
);

export default router;
