/**
 * GEM Z — Home Workout Plans Routes
 *
 * Routes:
 *   GET  /api/v1/home/workouts              — List home workouts
 *   GET  /api/v1/home/workouts/:id          — Workout detail
 *   POST /api/v1/home/workouts/:id/start    — Start workout
 *   GET  /api/v1/home/workouts/sessions     — User sessions
 *   GET  /api/v1/home/workouts/sessions/active — Active session
 *   POST /api/v1/home/workouts/sessions/:id/complete — Complete session
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { HomeWorkoutController } from './home.controller';
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

router.get('/workouts', auth, HomeWorkoutController.listWorkouts);

router.get(
    '/workouts/:id',
    auth,
    validate([param('id').isUUID().withMessage('Invalid workout ID')]),
    HomeWorkoutController.getWorkoutDetail
);

router.post(
    '/workouts/:id/start',
    auth,
    validate([param('id').isUUID().withMessage('Invalid workout ID')]),
    HomeWorkoutController.startWorkout
);

router.get('/workouts/sessions', auth, HomeWorkoutController.getSessions);

router.get('/workouts/sessions/active', auth, HomeWorkoutController.getActiveSession);

router.post(
    '/workouts/sessions/:id/complete',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid session ID'),
        body('duration_seconds').optional().isInt({ min: 1 }).withMessage('Duration must be positive'),
        body('calories_burned').optional().isInt({ min: 0 }).withMessage('Calories must be non-negative'),
    ]),
    HomeWorkoutController.completeWorkout
);

export default router;
