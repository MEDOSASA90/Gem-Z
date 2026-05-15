/**
 * GEM Z — AI Workout Generator Routes
 *
 * Routes:
 *   POST /api/v1/workout/generate  — Generate AI workout plan
 *   GET  /api/v1/workout           — List workout plans
 *   GET  /api/v1/workout/:id       — Get workout plan details
 *   POST /api/v1/workout/:id/archive — Archive workout plan
 *   DELETE /api/v1/workout/:id     — Delete workout plan
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { WorkoutController } from './workout.controller';
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
    '/generate',
    auth,
    validate([
        body('goal').isIn(['lose_weight', 'build_muscle', 'endurance']).withMessage('Goal must be lose_weight, build_muscle, or endurance'),
        body('fitness_level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Fitness level must be beginner, intermediate, or advanced'),
        body('equipment_available').optional().isArray({ max: 20 }).withMessage('Max 20 equipment items'),
        body('days_per_week').isInt({ min: 1, max: 7 }).withMessage('Days per week must be between 1 and 7'),
    ]),
    WorkoutController.generateWorkoutPlan
);

router.get('/', auth, WorkoutController.listWorkoutPlans);

router.get(
    '/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid workout plan ID'),
    ]),
    WorkoutController.getWorkoutPlan
);

router.post(
    '/:id/archive',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid workout plan ID'),
    ]),
    WorkoutController.archiveWorkoutPlan
);

router.delete(
    '/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid workout plan ID'),
    ]),
    WorkoutController.deleteWorkoutPlan
);

export default router;
