/**
 * GEM Z — Referral Routes
 *
 * Routes:
 *   GET    /api/v1/referrals/code           — Get user's referral code
 *   GET    /api/v1/referrals/stats          — Get user's referral stats
 *   GET    /api/v1/referrals/referred       — Get list of referred users
 *   POST   /api/v1/referrals/process        — Process a referral (public, on signup)
 *   POST   /api/v1/referrals/complete       — Mark referral as completed (public, post-onboarding)
 *   GET    /api/v1/referrals/leaderboard    — Get global referral leaderboard
 */

import express, { Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { ReferralController } from './referral.controller';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const router = express.Router();
const log = createLogger('referral-routes');

const auth = authenticate as any;

// ─── Validation Helpers ─────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
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

// ─── Referral Code ──────────────────────────────────────────────

router.get('/code', auth, ReferralController.getReferralCode);

// ─── Referral Stats ─────────────────────────────────────────────

router.get('/stats', auth, ReferralController.getReferralStats);

router.get('/referred', auth, ReferralController.getReferredUsers);

// ─── Referral Processing (Public - no auth) ─────────────────────

router.post(
    '/process',
    validate([
        body('referredId').isUUID().withMessage('referredId must be a valid UUID'),
        body('code').trim().notEmpty().withMessage('Referral code is required').isLength({ max: 20 }),
    ]),
    ReferralController.processReferral
);

router.post(
    '/complete',
    validate([
        body('referredId').isUUID().withMessage('referredId must be a valid UUID'),
    ]),
    ReferralController.completeReferral
);

// ─── Leaderboard ────────────────────────────────────────────────

router.get(
    '/leaderboard',
    validate([
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ]),
    ReferralController.getLeaderboard
);

export default router;
