/**
 * GEM Z — Group Classes Booking Routes
 *
 * Routes:
 *   GET  /api/v1/classes              — List classes
 *   GET  /api/v1/classes/schedule     — Weekly schedule
 *   GET  /api/v1/classes/:id          — Class detail
 *   POST /api/v1/classes/book         — Book a class
 *   DELETE /api/v1/classes/cancel/:bookingId — Cancel booking
 *   GET  /api/v1/classes/bookings     — User bookings
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { ClassesController } from './classes.controller';
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

router.get('/', auth, ClassesController.listClasses);

router.get('/schedule', auth, ClassesController.getWeeklySchedule);

router.get(
    '/bookings',
    auth,
    ClassesController.getUserBookings
);

router.get(
    '/:id',
    auth,
    validate([param('id').isUUID().withMessage('Invalid class ID')]),
    ClassesController.getClassDetail
);

router.post(
    '/book',
    auth,
    validate([
        body('class_id').isUUID().withMessage('Valid class ID is required'),
        body('schedule_id').isUUID().withMessage('Valid schedule ID is required'),
        body('booking_date').isISO8601().withMessage('Valid booking date is required'),
    ]),
    ClassesController.bookClass
);

router.delete(
    '/cancel/:bookingId',
    auth,
    validate([param('bookingId').isUUID().withMessage('Invalid booking ID')]),
    ClassesController.cancelBooking
);

export default router;
