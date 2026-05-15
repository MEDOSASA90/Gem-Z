/**
 * GEM Z — Nutritionist Consultation Routes
 *
 * Routes:
 *   GET  /api/v1/nutritionists                    — List nutritionists
 *   GET  /api/v1/nutritionists/:id                — Get nutritionist profile
 *   POST /api/v1/nutritionists/book               — Book session
 *   GET  /api/v1/nutritionists/sessions           — My sessions (as client)
 *   GET  /api/v1/nutritionists/my-sessions        — My sessions (as nutritionist)
 *   PUT  /api/v1/nutritionists/sessions/:id       — Update session status
 *   POST /api/v1/nutritionists/review             — Submit review
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { NutritionistController } from './nutritionist.controller';

const router = express.Router();

const VALID_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
const VALID_SPECIALTIES = [
    'sports_nutrition', 'weight_loss', 'muscle_gain', 'clinical_nutrition',
    'vegan', 'keto', 'diabetes', 'pregnancy', 'pediatric', 'senior_nutrition',
    'meal_planning', 'supplement_guidance',
];

// ─── Nutritionist Profiles ──────────────────────────────────────

router.get('/', authenticate as any, validateQuery([
    query('specialty').optional().trim().isIn(VALID_SPECIALTIES),
    query('language').optional().trim().isLength({ min: 2, max: 5 }),
    query('verified').optional().isBoolean(),
    query('available').optional().isBoolean(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('maxRate').optional().isFloat({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), NutritionistController.listNutritionists as any);

router.get('/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().isUUID().withMessage('Valid nutritionist ID is required'),
]), NutritionistController.getNutritionist as any);

// ─── Session Management ─────────────────────────────────────────

router.post('/book', authenticate as any, validateBody([
    body('nutritionistId').trim().notEmpty().isUUID().withMessage('Valid nutritionistId is required'),
    body('scheduledAt').trim().notEmpty().isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
    body('durationMinutes').optional().isInt({ min: 15, max: 180 }).toInt(),
    body('notes').optional().trim().isLength({ max: 1000 }),
    body('clientGoals').optional().trim().isLength({ max: 1000 }),
]), NutritionistController.bookSession as any);

router.get('/sessions', authenticate as any, validateQuery([
    query('status').optional().trim().isIn(VALID_STATUSES),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), NutritionistController.listClientSessions as any);

router.get('/my-sessions', authenticate as any, validateQuery([
    query('status').optional().trim().isIn(VALID_STATUSES),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), NutritionistController.listNutritionistSessions as any);

router.put('/sessions/:id', authenticate as any, validateBody([
    body('status').trim().notEmpty().isIn(VALID_STATUSES),
    body('mealPlanSent').optional().isBoolean(),
    body('followUpDate').optional().isISO8601(),
    body('notes').optional().trim().isLength({ max: 1000 }),
]), NutritionistController.updateSessionStatus as any);

router.post('/review', authenticate as any, validateBody([
    body('sessionId').trim().notEmpty().isUUID().withMessage('Valid sessionId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().trim().isLength({ max: 2000 }),
]), NutritionistController.submitReview as any);

export default router;
