/**
 * GEM Z — Payment Routes
 *
 * Routes:
 *   POST   /api/v1/payment/checkout           — Create checkout session
 *   GET    /api/v1/payment/methods            — List payment methods
 *   POST   /api/v1/payment/methods            — Add payment method
 *   DELETE /api/v1/payment/methods/:id        — Remove payment method
 *   POST   /api/v1/payment/webhook/fawry      — Fawry webhook (public)
 *   POST   /api/v1/payment/webhook/paymob     — Paymob webhook (public)
 *   POST   /api/v1/payment/refund             — Request refund
 *   GET    /api/v1/payment/transactions       — Transaction history
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { PaymentService } from './payment.service';
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
const paymentService = new PaymentService(db);
const log = createLogger('payment-routes');

const auth = authenticate as any;

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

// ─── Checkout ───────────────────────────────────────────────────

router.post('/checkout', auth,
    validate([
        body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
        body('currency').optional().isIn(['EGP', 'USD', 'EUR']).withMessage('Invalid currency'),
        body('gateway').optional().isIn(['fawry', 'paymob']).withMessage('Gateway must be fawry or paymob'),
        body('description').optional().trim().isLength({ max: 500 }),
        body('returnUrl').optional().isURL(),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const { amount, currency, gateway, description, returnUrl } = req.body;

            const session = await paymentService.createCheckout(userId, {
                amount: Number(amount),
                currency,
                gateway,
                description,
                returnUrl,
            });

            res.status(201).json(success(session, 'Checkout session created'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Payment Methods ────────────────────────────────────────────

router.get('/methods', auth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const methods = await paymentService.getPaymentMethods(userId);
        res.status(200).json(success(methods, 'Payment methods retrieved'));
    } catch (error) {
        next(error);
    }
});

router.post('/methods', auth,
    validate([
        body('type').isIn(['card', 'wallet', 'fawry', 'paymob']).withMessage('Invalid payment type'),
        body('token').notEmpty().withMessage('Payment token is required'),
        body('lastFour').optional().isLength({ min: 4, max: 4 }).withMessage('lastFour must be 4 digits'),
        body('brand').optional().trim(),
        body('expiryMonth').optional().matches(/^\d{2}$/).withMessage('expiryMonth must be MM format'),
        body('expiryYear').optional().matches(/^\d{2,4}$/).withMessage('expiryYear must be YY or YYYY format'),
        body('setDefault').optional().isBoolean(),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const { type, token, lastFour, brand, expiryMonth, expiryYear, setDefault } = req.body;

            const method = await paymentService.addPaymentMethod(userId, {
                type,
                token,
                lastFour,
                brand,
                expiryMonth,
                expiryYear,
                setDefault,
            });

            res.status(201).json(success(method, 'Payment method added'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/methods/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid payment method ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const methodId = req.params.id;

            await paymentService.removePaymentMethod(methodId, userId);
            res.status(200).json(success(null, 'Payment method removed'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Webhooks ───────────────────────────────────────────────────
// Note: Webhooks are PUBLIC routes — no auth required
// They use their own signature verification (HMAC)

router.post('/webhook/fawry', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const payload = req.body;
        const result = await paymentService.processFawryWebhook(payload);

        if (!result.received) {
            return res.status(401).json({ received: false, message: result.message });
        }

        res.status(200).json({ received: true, processed: result.processed });
    } catch (error) {
        next(error);
    }
});

router.post('/webhook/paymob', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const payload = req.body;
        const result = await paymentService.processPaymobWebhook(payload);

        if (!result.received) {
            return res.status(401).json({ received: false, message: result.message });
        }

        res.status(200).json({ received: true, processed: result.processed });
    } catch (error) {
        next(error);
    }
});

// ─── Refund ─────────────────────────────────────────────────────

router.post('/refund', auth,
    validate([
        body('transactionId').isUUID().withMessage('Valid transactionId is required'),
        body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
        body('reason').trim().notEmpty().withMessage('Refund reason is required').isLength({ max: 500 }),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const { transactionId, amount, reason } = req.body;

            const refund = await paymentService.requestRefund(userId, { transactionId, amount, reason });
            res.status(201).json(success(refund, 'Refund requested'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Transaction History ────────────────────────────────────────

router.get('/transactions', auth,
    validate([
        query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
        query('type').optional().trim(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const { status, type, limit, offset } = req.query;

            const history = await paymentService.getTransactionHistory(userId, {
                status: status as string | undefined,
                type: type as string | undefined,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
            });

            res.status(200).json(success(history, 'Transaction history retrieved'));
        } catch (error) {
            next(error);
        }
    }
);

export default router;
