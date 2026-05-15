/**
 * GEM Z — Water Tracking Routes
 *
 * Routes:
 *   POST   /api/v1/water/log          — Log water intake
 *   GET    /api/v1/water/today        — Get today's data
 *   GET    /api/v1/water/history      — Get history for date
 *   GET    /api/v1/water/weekly       — Get weekly summary
 *   DELETE /api/v1/water/logs/:id     — Delete water log
 *   GET    /api/v1/water/goal         — Get water goal
 *   PUT    /api/v1/water/goal         — Set water goal
 *   GET    /api/v1/water/stats        — Get water stats
 *   GET    /api/v1/water/reminder     — Get reminder settings
 *   PUT    /api/v1/water/reminder     — Set reminder settings
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { WaterController } from './water.controller';
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
        body('amountMl').isInt({ min: 10, max: 5000 }).withMessage('Amount must be 10ml - 5000ml'),
        body('source').optional().isIn(['manual', 'reminder', 'wearable']).withMessage('Invalid source'),
        body('notes').optional().trim().isLength({ max: 500 }).withMessage('Max 500 characters'),
    ]),
    WaterController.logWater
);

router.get('/today', auth, WaterController.getToday);

router.get(
    '/history',
    auth,
    validate([
        query('date').optional().isISO8601().withMessage('Invalid date'),
    ]),
    WaterController.getHistory
);

router.get('/weekly', auth, WaterController.getWeekly);

router.delete(
    '/logs/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid log ID'),
    ]),
    WaterController.deleteLog
);

router.get('/goal', auth, WaterController.getGoal);

router.put(
    '/goal',
    auth,
    validate([
        body('goalMl').isInt({ min: 500, max: 10000 }).withMessage('Goal must be 500ml - 10000ml'),
    ]),
    WaterController.setGoal
);

router.get('/stats', auth, WaterController.getStats);

router.get('/reminder', auth, WaterController.getReminder);

router.put(
    '/reminder',
    auth,
    validate([
        body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
        body('intervalMinutes').isInt({ min: 15, max: 240 }).withMessage('Interval must be 15-240 minutes'),
        body('startTime').matches(/^([0-1]?\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM'),
        body('endTime').matches(/^([0-1]?\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM'),
    ]),
    WaterController.setReminder
);

export default router;
