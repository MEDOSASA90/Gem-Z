/**
 * GEM Z — Subscription Routes
 *
 * Routes:
 *   GET  /api/v1/subscriptions                   — List my subscriptions
 *   POST /api/v1/subscriptions                   — Create subscription
 *   PUT  /api/v1/subscriptions/:id/cancel        — Cancel subscription
 *   PUT  /api/v1/subscriptions/:id/pause         — Pause subscription
 *   PUT  /api/v1/subscriptions/:id/resume        — Resume subscription
 *   GET  /api/v1/subscriptions/:id/invoices      — Get invoices
 *   POST /api/v1/subscriptions/process-renewals  — Admin: trigger renewals
 */

import express from 'express';
import { body, param } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams } from '../../core/middlewares/validation.middleware';
import { SubscriptionController } from './subscription.controller';

const router = express.Router();

// ─── User Subscription Routes ───────────────────────────────────

router.get('/', authenticate as any, SubscriptionController.listSubscriptions as any);

router.post('/', authenticate as any, validateBody([
    body('planId').trim().notEmpty().withMessage('planId is required').isUUID().withMessage('Invalid plan ID'),
    body('autoRenew').optional().isBoolean().withMessage('autoRenew must be a boolean'),
]), SubscriptionController.createSubscription as any);

router.put('/:id/cancel', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Subscription ID is required').isUUID().withMessage('Invalid subscription ID'),
]), validateBody([
    body('reason').optional().trim().isString().isLength({ max: 500 }),
]), SubscriptionController.cancelSubscription as any);

router.put('/:id/pause', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Subscription ID is required').isUUID(),
]), validateBody([
    body('reason').optional().trim().isString().isLength({ max: 500 }),
]), SubscriptionController.pauseSubscription as any);

router.put('/:id/resume', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Subscription ID is required').isUUID(),
]), SubscriptionController.resumeSubscription as any);

router.get('/:id/invoices', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Subscription ID is required').isUUID(),
]), SubscriptionController.getInvoices as any);

// ─── Admin Routes ───────────────────────────────────────────────

router.post('/process-renewals', authenticate as any, SubscriptionController.processRenewals as any);

export default router;
