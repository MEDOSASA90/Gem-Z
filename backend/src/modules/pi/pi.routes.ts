/**
 * GEM Z — Pi Network Routes
 */

import { Router } from 'express';
import { PiController } from './pi.controller';
import { PiService } from './pi.service';
import { authenticateRequest } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/role.middleware';
import { rateLimit } from '../../core/middlewares/rate-limit.middleware';
import { validate } from '../../core/middlewares/validation.middleware';
import { body, param } from 'express-validator';

export function createPiRoutes(db: any): Router {
  const router = Router();
  const piService = new PiService(db);
  const controller = new PiController(piService);

  // Rate limiter for Pi endpoints
  const piRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

  // ═══════════════════════════════════════════════════════════
  // U2A: User-to-App Payments
  // ═══════════════════════════════════════════════════════════

  router.post(
    '/payments/create-intent',
    authenticateRequest,
    piRateLimit,
    validate([
      body('piUserUid').isString().notEmpty().withMessage('Pi user UID is required'),
      body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01 Pi'),
      body('memo').isString().notEmpty().withMessage('Memo is required'),
      body('productType').isIn(['subscription', 'store', 'trainer', 'reward', 'refund']).withMessage('Invalid product type'),
    ]),
    controller.createPaymentIntent.bind(controller)
  );

  router.post(
    '/payments/approve',
    authenticateRequest,
    piRateLimit,
    validate([
      body('internalPaymentId').isUUID().withMessage('Invalid payment ID'),
      body('piPaymentId').isString().notEmpty().withMessage('Pi payment ID is required'),
    ]),
    controller.approvePayment.bind(controller)
  );

  router.post(
    '/payments/complete',
    authenticateRequest,
    piRateLimit,
    validate([
      body('internalPaymentId').isUUID().withMessage('Invalid payment ID'),
      body('piPaymentId').isString().notEmpty().withMessage('Pi payment ID is required'),
      body('txid').isString().notEmpty().withMessage('Transaction ID is required'),
    ]),
    controller.completePayment.bind(controller)
  );

  // ═══════════════════════════════════════════════════════════
  // A2U: App-to-User Payments (Admin only)
  // ═══════════════════════════════════════════════════════════

  router.post(
    '/payments/a2u',
    authenticateRequest,
    requireRole(['super_admin', 'store_admin']),
    validate([
      body('piUserUid').isString().notEmpty(),
      body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01 Pi'),
      body('memo').isString().notEmpty(),
      body('userId').isUUID().withMessage('Invalid user ID'),
    ]),
    controller.createA2UPayment.bind(controller)
  );

  // ═══════════════════════════════════════════════════════════
  // Authentication
  // ═══════════════════════════════════════════════════════════

  router.post(
    '/auth',
    piRateLimit,
    validate([
      body('accessToken').isString().notEmpty().withMessage('Access token is required'),
    ]),
    controller.authenticatePiUser.bind(controller)
  );

  // ═══════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════

  router.get(
    '/payments/history',
    authenticateRequest,
    controller.getPaymentHistory.bind(controller)
  );

  router.get(
    '/stats',
    authenticateRequest,
    controller.getStats.bind(controller)
  );

  // ═══════════════════════════════════════════════════════════
  // Admin
  // ═══════════════════════════════════════════════════════════

  router.get(
    '/admin/payments',
    authenticateRequest,
    requireRole(['super_admin']),
    controller.getAllPayments.bind(controller)
  );

  router.post(
    '/admin/payments/:id/cancel',
    authenticateRequest,
    requireRole(['super_admin']),
    validate([
      param('id').isUUID().withMessage('Invalid payment ID'),
      body('reason').isString().notEmpty().withMessage('Cancellation reason is required'),
    ]),
    controller.cancelPayment.bind(controller)
  );

  return router;
}
