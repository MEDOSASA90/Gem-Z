/**
 * GEM Z — Gift Cards + Subscription Gifting Routes
 *
 * Routes:
 *   POST /api/v1/gift/create          — Create gift card
 *   GET  /api/v1/gift/validate/:code  — Validate gift card
 *   POST /api/v1/gift/redeem          — Redeem gift card
 *   GET  /api/v1/gift/sent            — List sent gifts
 *   GET  /api/v1/gift/received        — List received gifts
 *   POST /api/v1/gift/:id/cancel      — Cancel gift card
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { GiftController } from './gift.controller';

const router = express.Router();

const VALID_GIFT_TYPES = ['balance', 'subscription'];
const VALID_THEMES = ['gold', 'silver', 'rose', 'dark', 'gemz', 'neon'];

// ─── Gift Card CRUD ─────────────────────────────────────────────

router.post('/create', authenticate as any, validateBody([
    body('recipientEmail')
        .trim()
        .notEmpty()
        .withMessage('recipientEmail is required')
        .isEmail()
        .withMessage('recipientEmail must be a valid email'),
    body('recipientName').optional().trim().isLength({ max: 100 }),
    body('recipientPhone').optional().trim().isLength({ max: 20 }),
    body('message').optional().trim().isLength({ max: 500 }),
    body('giftType')
        .trim()
        .notEmpty()
        .isIn(VALID_GIFT_TYPES)
        .withMessage(`giftType must be one of: ${VALID_GIFT_TYPES.join(', ')}`),
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('amount must be a positive number'),
    body('currency').optional().trim().isLength({ min: 3, max: 3 }).isUppercase(),
    body('subscriptionPlanId').optional().trim().isUUID(),
    body('subscriptionMonths').optional().isInt({ min: 1, max: 24 }).toInt(),
    body('designTheme').optional().trim().isIn(VALID_THEMES),
    body('expiryDays').optional().isInt({ min: 1, max: 730 }).toInt(),
]), GiftController.createGift as any);

router.get('/validate/:code', validateParams([
    param('code').trim().notEmpty().withMessage('Gift card code is required'),
]), GiftController.validateGift as any);

router.post('/redeem', authenticate as any, validateBody([
    body('code').trim().notEmpty().withMessage('code is required'),
    body('email').optional().isEmail(),
]), GiftController.redeemGift as any);

router.get('/sent', authenticate as any, validateQuery([
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), GiftController.listSent as any);

router.get('/received', authenticate as any, validateQuery([
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), GiftController.listReceived as any);

router.post('/:id/cancel', authenticate as any, validateParams([
    param('id').trim().notEmpty().isUUID().withMessage('Valid gift card ID is required'),
]), GiftController.cancelGift as any);

export default router;
