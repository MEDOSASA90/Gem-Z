/**
 * GEM Z — Trainer Routes
 *
 * Routes:
 *   GET  /api/v1/trainer/stats            — Trainer stats
 *   GET  /api/v1/trainer/revenue          — Revenue report
 *   GET  /api/v1/trainer/clients          — List clients
 *   POST /api/v1/trainer/assign           — Assign plan to client
 *   GET  /api/v1/trainer/churn-prediction — Churn prediction
 *   GET  /api/v1/trainer/plans            — List trainer plans
 *   POST /api/v1/trainer/plans            — Create plan
 *   PUT  /api/v1/trainer/plans/:id        — Update plan
 *   DELETE /api/v1/trainer/plans/:id      — Delete plan
 *   GET  /api/v1/trainer/sessions         — List sessions
 *   POST /api/v1/trainer/sessions         — Create session
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/role.middleware';
import { TrainerService } from './trainer.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ErrorCode,
    buildErrorResponse,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const router = express.Router();
const trainerService = new TrainerService(db);
const log = createLogger('trainer-routes');

const auth = authenticate as any;
const trainerRole = requireRole(['trainer', 'admin', 'super_admin']) as any;

// ─── Validation Helpers ─────────────────────────────────────────

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

// ─── Stats ──────────────────────────────────────────────────────

router.get('/stats', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const stats = await trainerService.getTrainerStats(trainerId);
        res.status(200).json(success(stats, 'Trainer stats retrieved'));
    } catch (error) {
        next(error);
    }
});

// ─── Revenue ────────────────────────────────────────────────────

router.get('/revenue', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const report = await trainerService.getTrainerRevenue(trainerId);
        res.status(200).json(success(report, 'Revenue report retrieved'));
    } catch (error) {
        next(error);
    }
});

// ─── Clients ────────────────────────────────────────────────────

router.get('/clients', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const clients = await trainerService.getTrainerClients(trainerId);
        res.status(200).json(success(clients, 'Clients retrieved'));
    } catch (error) {
        next(error);
    }
});

// ─── Plan Assignment ────────────────────────────────────────────

router.post('/assign', auth, trainerRole,
    validate([
        body('traineeId').isUUID().withMessage('Valid traineeId is required'),
        body('planId').isUUID().withMessage('Valid planId is required'),
        body('planType').isIn(['WORKOUT', 'DIET']).withMessage('planType must be WORKOUT or DIET'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const trainerId = req.user!.userId;
            const { traineeId, planId, planType } = req.body;

            const assignment = await trainerService.assignPlanToClient(trainerId, { traineeId, planId, planType });
            res.status(200).json(success(assignment, 'Plan assigned successfully'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Churn Prediction ───────────────────────────────────────────

router.get('/churn-prediction', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const predictions = await trainerService.getChurnPrediction(trainerId);
        res.status(200).json(success(predictions, 'Churn predictions retrieved'));
    } catch (error) {
        next(error);
    }
});

// ─── Trainer Plans ──────────────────────────────────────────────

router.get('/plans', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const plans = await trainerService.getTrainerPlans(trainerId);
        res.status(200).json(success(plans, 'Trainer plans retrieved'));
    } catch (error) {
        next(error);
    }
});

router.post('/plans', auth, trainerRole,
    validate([
        body('name').trim().notEmpty().withMessage('Plan name is required').isLength({ max: 200 }),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('type').isIn(['WORKOUT', 'DIET']).withMessage('Type must be WORKOUT or DIET'),
        body('priceEGP').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
        body('durationDays').isInt({ min: 1, max: 365 }).withMessage('Duration must be 1-365 days'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const trainerId = req.user!.userId;
            const { name, description, type, priceEGP, durationDays } = req.body;

            const plan = await trainerService.createTrainerPlan(trainerId, {
                name,
                description,
                type,
                priceEGP,
                durationDays,
            });
            res.status(201).json(success(plan, 'Plan created'));
        } catch (error) {
            next(error);
        }
    }
);

router.put('/plans/:id', auth, trainerRole,
    validate([
        param('id').isUUID().withMessage('Invalid plan ID'),
        body('name').optional().trim().notEmpty().isLength({ max: 200 }),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('priceEGP').optional().isFloat({ min: 0.01 }),
        body('durationDays').optional().isInt({ min: 1, max: 365 }),
        body('isActive').optional().isBoolean(),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const planId = req.params.id;
            const trainerId = req.user!.userId;
            const { name, description, priceEGP, durationDays, isActive } = req.body;

            const plan = await trainerService.updateTrainerPlan(planId, trainerId, {
                name,
                description,
                priceEGP,
                durationDays,
                isActive,
            });
            res.status(200).json(success(plan, 'Plan updated'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/plans/:id', auth, trainerRole,
    validate([
        param('id').isUUID().withMessage('Invalid plan ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const planId = req.params.id;
            const trainerId = req.user!.userId;

            await trainerService.deleteTrainerPlan(planId, trainerId);
            res.status(200).json(success(null, 'Plan deleted'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Sessions ───────────────────────────────────────────────────

router.get('/sessions', auth, trainerRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trainerId = req.user!.userId;
        const sessions = await trainerService.getTrainerSessions(trainerId);
        res.status(200).json(success(sessions, 'Sessions retrieved'));
    } catch (error) {
        next(error);
    }
});

router.post('/sessions', auth, trainerRole,
    validate([
        body('traineeId').isUUID().withMessage('Valid traineeId is required'),
        body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
        body('durationMinutes').isInt({ min: 15, max: 300 }).withMessage('Duration must be 15-300 minutes'),
        body('type').isIn(['ONLINE', 'IN_PERSON']).withMessage('Type must be ONLINE or IN_PERSON'),
        body('notes').optional().trim().isLength({ max: 1000 }),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const trainerId = req.user!.userId;
            const { traineeId, scheduledAt, durationMinutes, type, notes } = req.body;

            const session = await trainerService.createTrainerSession(trainerId, {
                traineeId,
                scheduledAt: new Date(scheduledAt),
                durationMinutes,
                type,
                notes,
            });
            res.status(201).json(success(session, 'Session created'));
        } catch (error) {
            next(error);
        }
    }
);

export default router;
