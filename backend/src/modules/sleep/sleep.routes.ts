/**
 * GEM Z — Sleep Tracking Routes
 *
 * Routes:
 *   POST   /api/v1/sleep/log          — Log sleep
 *   GET    /api/v1/sleep/logs         — List sleep logs
 *   GET    /api/v1/sleep/logs/:id     — Get sleep log
 *   PUT    /api/v1/sleep/logs/:id     — Update sleep log
 *   DELETE /api/v1/sleep/logs/:id     — Delete sleep log
 *   GET    /api/v1/sleep/stats        — Get sleep stats
 *   GET    /api/v1/sleep/trends       — Get sleep trends
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { SleepController } from './sleep.controller';
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
    '/log',
    auth,
    validate([
        body('bedTime').isISO8601().withMessage('Valid bed time is required'),
        body('wakeTime').isISO8601().withMessage('Valid wake time is required'),
        body('quality').optional().isInt({ min: 1, max: 10 }).withMessage('Quality must be 1-10'),
        body('deepSleepMinutes').optional().isInt({ min: 0 }).withMessage('Must be positive'),
        body('lightSleepMinutes').optional().isInt({ min: 0 }).withMessage('Must be positive'),
        body('remSleepMinutes').optional().isInt({ min: 0 }).withMessage('Must be positive'),
        body('awakeMinutes').optional().isInt({ min: 0 }).withMessage('Must be positive'),
        body('factors').optional().isArray({ max: 10 }).withMessage('Max 10 factors'),
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Max 1000 characters'),
    ]),
    SleepController.logSleep
);

router.get(
    '/logs',
    auth,
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
    ]),
    SleepController.listSleepLogs
);

router.get(
    '/logs/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid sleep log ID'),
    ]),
    SleepController.getSleepLog
);

router.put(
    '/logs/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid sleep log ID'),
        body('bedTime').optional().isISO8601(),
        body('wakeTime').optional().isISO8601(),
        body('quality').optional().isInt({ min: 1, max: 10 }),
        body('factors').optional().isArray({ max: 10 }),
        body('notes').optional().trim().isLength({ max: 1000 }),
    ]),
    SleepController.updateSleepLog
);

router.delete(
    '/logs/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid sleep log ID'),
    ]),
    SleepController.deleteSleepLog
);

router.get(
    '/stats',
    auth,
    validate([
        query('days').optional().isInt({ min: 1, max: 365 }),
    ]),
    SleepController.getSleepStats
);

router.get(
    '/trends',
    auth,
    validate([
        query('days').optional().isInt({ min: 1, max: 365 }),
    ]),
    SleepController.getSleepTrends
);

export default router;
