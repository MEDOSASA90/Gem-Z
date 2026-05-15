/**
 * GEM Z — Nutrition Scanner Routes
 *
 * Routes:
 *   POST /api/v1/nutrition/scan      — Scan food photo
 *   GET  /api/v1/nutrition/history   — List scan history
 *   GET  /api/v1/nutrition/daily     — Get daily nutrition summary
 *   GET  /api/v1/nutrition/trends    — Get nutrition trends
 *   GET  /api/v1/nutrition/:id       — Get single scan details
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { NutritionController } from './nutrition.controller';

const router = express.Router();

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─── Scan ───────────────────────────────────────────────────────

router.post('/scan', authenticate as any, validateBody([
    body('imageUrl')
        .trim()
        .notEmpty()
        .withMessage('imageUrl is required')
        .isURL()
        .withMessage('imageUrl must be a valid URL'),
    body('userNotes')
        .optional()
        .trim()
        .isString()
        .isLength({ max: 500 })
        .withMessage('userNotes must not exceed 500 characters'),
    body('mealType')
        .optional()
        .trim()
        .isIn(VALID_MEAL_TYPES)
        .withMessage(`mealType must be one of: ${VALID_MEAL_TYPES.join(', ')}`),
]), NutritionController.scanFood as any);

// ─── Retrieval ──────────────────────────────────────────────────

router.get('/history', authenticate as any, validateQuery([
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('mealType').optional().trim().isIn(VALID_MEAL_TYPES),
]), NutritionController.listHistory as any);

router.get('/daily', authenticate as any, validateQuery([
    query('date').optional().isISO8601().withMessage('date must be in YYYY-MM-DD format'),
]), NutritionController.getDailyNutrition as any);

router.get('/trends', authenticate as any, validateQuery([
    query('days').optional().isInt({ min: 1, max: 90 }).toInt(),
]), NutritionController.getTrends as any);

router.get('/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Scan ID is required').isUUID(),
]), NutritionController.getScan as any);

export default router;
