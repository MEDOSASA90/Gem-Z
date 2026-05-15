/**
 * GEM Z — Food Delivery Routes
 *
 * Routes:
 *   GET  /api/v1/food/restaurants      — List healthy restaurants
 *   GET  /api/v1/food/menu/:restaurantId — Get restaurant menu
 *   POST /api/v1/food/order            — Place order
 *   GET  /api/v1/food/orders           — List user orders
 *   GET  /api/v1/food/orders/:id       — Get order details
 *   POST /api/v1/food/orders/:id/cancel — Cancel order
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { FoodController } from './food.controller';
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

router.get('/restaurants', auth, FoodController.listRestaurants);

router.get(
    '/menu/:restaurantId',
    auth,
    validate([param('restaurantId').isUUID().withMessage('Invalid restaurant ID')]),
    FoodController.getMenu
);

router.post(
    '/order',
    auth,
    validate([
        body('restaurant_id').isUUID().withMessage('Valid restaurant ID is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.menuItemId').isUUID().withMessage('Valid menu item ID is required'),
        body('items.*.quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be 1-50'),
        body('delivery_address').trim().notEmpty().withMessage('Delivery address is required'),
        body('payment_method').optional().isIn(['cash', 'card', 'wallet']).withMessage('Invalid payment method'),
    ]),
    FoodController.placeOrder
);

router.get('/orders', auth, FoodController.getOrders);

router.get(
    '/orders/:id',
    auth,
    validate([param('id').isUUID().withMessage('Invalid order ID')]),
    FoodController.getOrder
);

router.post(
    '/orders/:id/cancel',
    auth,
    validate([param('id').isUUID().withMessage('Invalid order ID')]),
    FoodController.cancelOrder
);

export default router;
