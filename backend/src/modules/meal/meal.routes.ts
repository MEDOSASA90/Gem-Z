/**
 * GEM Z — Meal Planning Routes
 *
 * Routes:
 *   POST /api/v1/meals/generate        — Generate weekly meal plan
 *   GET  /api/v1/meals                 — List meal plans
 *   GET  /api/v1/meals/:id             — Get meal plan details
 *   POST /api/v1/meals/:id/archive     — Archive meal plan
 *   DELETE /api/v1/meals/:id           — Delete meal plan
 *   GET  /api/v1/meals/:id/grocery-list — Get grocery list
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { MealController } from './meal.controller';
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
        body('calorieTarget').isInt({ min: 800, max: 8000 }).withMessage('Calorie target must be between 800 and 8000'),
        body('dietaryPreference').optional().trim().isIn(['balanced', 'keto', 'vegan', 'vegetarian', 'paleo', 'mediterranean', 'low-carb', 'high-protein']).withMessage('Invalid dietary preference'),
        body('allergies').optional().isArray({ max: 20 }).withMessage('Max 20 allergies'),
        body('weekStart').optional().isISO8601().withMessage('Invalid date format'),
    ]),
    MealController.generateMealPlan
);

router.get('/', auth, MealController.listMealPlans);

router.get(
    '/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid meal plan ID'),
    ]),
    MealController.getMealPlan
);

router.post(
    '/:id/archive',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid meal plan ID'),
    ]),
    MealController.archiveMealPlan
);

router.delete(
    '/:id',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid meal plan ID'),
    ]),
    MealController.deleteMealPlan
);

router.get(
    '/:id/grocery-list',
    auth,
    validate([
        param('id').isUUID().withMessage('Invalid meal plan ID'),
    ]),
    MealController.getGroceryList
);

export default router;
