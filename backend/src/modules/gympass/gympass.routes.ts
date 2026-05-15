/**
 * GEM Z — Gym Pass Routes
 *
 * Routes:
 *   POST   /api/v1/gympass/plans              — Create a gym pass plan (admin)
 *   GET    /api/v1/gympass/plans               — List available plans
 *   POST   /api/v1/gympass/purchase            — Purchase a gym pass
 *   GET    /api/v1/gympass/mypasses            — Get user's active passes
 *   POST   /api/v1/gympass/:id/cancel-renew    — Cancel auto-renew
 *   GET    /api/v1/gympass/validate/:gymId     — Validate pass for gym entry
 *   POST   /api/v1/gympass/:id/redeem          — Redeem a visit
 *   GET    /api/v1/gympass/network             — Get gym network
 *   GET    /api/v1/gympass/history             — Get pass usage history
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { GymPassController } from './gympass.controller';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const router = express.Router();
const log = createLogger('gympass-routes');

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

// ─── Plan Management ────────────────────────────────────────────

router.post(
    '/plans',
    auth,
    validate([
        body('name').trim().notEmpty().withMessage('Plan name is required').isLength({ max: 200 }),
        body('description').optional().trim().isLength({ max: 1000 }),
        body('tier').isIn(['basic', 'premium', 'elite']).withMessage('tier must be: basic, premium, elite'),
        body('price').isFloat({ min: 0 }).withMessage('price must be a non-negative number'),
        body('priceUnit').optional().trim().isLength({ max: 10 }),
        body('durationDays').isInt({ min: 1 }).withMessage('durationDays must be at least 1'),
        body('maxGyms').isInt({ min: 1 }).withMessage('maxGyms must be at least 1'),
        body('maxVisitsPerMonth').optional().isInt({ min: 1 }),
        body('perks').optional().isObject(),
    ]),
    GymPassController.createPlan
);

router.get(
    '/plans',
    auth,
    validate([
        query('tier').optional().isIn(['basic', 'premium', 'elite']),
    ]),
    GymPassController.listPlans
);

// ─── Pass Management ────────────────────────────────────────────

router.post(
    '/purchase',
    auth,
    validate([
        body('planId').isUUID().withMessage('planId must be a valid UUID'),
        body('autoRenew').optional().isBoolean(),
    ]),
    GymPassController.purchasePass
);

router.get('/mypasses', auth, GymPassController.getUserPasses);

router.post(
    '/:id/cancel-renew',
    auth,
    validate([param('id').isUUID()]),
    GymPassController.cancelAutoRenew
);

// ─── Validation & Redemption ────────────────────────────────────

router.get(
    '/validate/:gymId',
    auth,
    validate([param('gymId').isUUID()]),
    GymPassController.validatePass
);

router.post(
    '/:id/redeem',
    auth,
    validate([
        param('id').isUUID(),
        body('gymId').isUUID().withMessage('gymId is required and must be a valid UUID'),
    ]),
    GymPassController.redeemVisit
);

// ─── Gym Network ────────────────────────────────────────────────

router.get(
    '/network',
    auth,
    validate([
        query('city').optional().trim().isLength({ max: 100 }),
        query('tier').optional().isIn(['basic', 'premium', 'elite']),
    ]),
    GymPassController.getGymNetwork
);

router.get(
    '/history',
    auth,
    validate([query('passId').optional().isUUID()]),
    GymPassController.getPassHistory
);

export default router;
