/**
 * GEM Z — Booking Routes
 *
 * Routes:
 *   POST   /api/v1/bookings                  — Book a PT session
 *   GET    /api/v1/bookings                  — List user's bookings
 *   GET    /api/v1/bookings/:id              — Get booking details
 *   POST   /api/v1/bookings/:id/cancel       — Cancel booking
 *   POST   /api/v1/bookings/:id/reschedule   — Reschedule booking
 *   POST   /api/v1/bookings/:id/confirm      — Confirm booking (trainer)
 *   POST   /api/v1/bookings/:id/complete     — Mark booking as completed (trainer)
 *   GET    /api/v1/bookings/trainer/:trainerId/availability — Get trainer availability
 *   GET    /api/v1/bookings/trainer/:trainerId/calendar     — Get trainer calendar
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { BookingController } from './booking.controller';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const router = express.Router();
const log = createLogger('booking-routes');

const auth = authenticate as any;

// ─── Validation Helpers ─────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
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

// ─── Booking CRUD ───────────────────────────────────────────────

router.post(
    '/',
    auth,
    validate([
        body('trainerId').isUUID().withMessage('trainerId is required'),
        body('scheduledDate').isISO8601().withMessage('scheduledDate must be a valid date'),
        body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('startTime must be HH:mm'),
        body('sessionType').isIn(['in_person', 'online', 'group']).withMessage('sessionType must be: in_person, online, group'),
        body('gymId').optional().isUUID(),
        body('durationMinutes').optional().isInt({ min: 15, max: 480 }),
        body('notes').optional().trim().isLength({ max: 1000 }),
    ]),
    BookingController.createBooking
);

router.get(
    '/',
    auth,
    validate([
        query('role').optional().isIn(['trainee', 'trainer']),
        query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
        query('upcoming').optional().isBoolean(),
    ]),
    BookingController.getBookings
);

router.get(
    '/:id',
    auth,
    validate([param('id').isUUID()]),
    BookingController.getBooking
);

// ─── Booking Actions ────────────────────────────────────────────

router.post(
    '/:id/cancel',
    auth,
    validate([
        param('id').isUUID(),
        body('reason').optional().trim().isLength({ max: 500 }),
    ]),
    BookingController.cancelBooking
);

router.post(
    '/:id/reschedule',
    auth,
    validate([
        param('id').isUUID(),
        body('scheduledDate').isISO8601(),
        body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('durationMinutes').optional().isInt({ min: 15, max: 480 }),
    ]),
    BookingController.rescheduleBooking
);

router.post(
    '/:id/confirm',
    auth,
    validate([param('id').isUUID()]),
    BookingController.confirmBooking
);

router.post(
    '/:id/complete',
    auth,
    validate([param('id').isUUID()]),
    BookingController.completeBooking
);

// ─── Calendar & Availability ────────────────────────────────────

router.get(
    '/trainer/:trainerId/availability',
    auth,
    validate([
        param('trainerId').isUUID(),
        query('date').isISO8601().withMessage('date query parameter is required'),
    ]),
    BookingController.getTrainerAvailability
);

router.get(
    '/trainer/:trainerId/calendar',
    auth,
    validate([
        param('trainerId').isUUID(),
        query('startDate').isISO8601(),
        query('endDate').isISO8601(),
    ]),
    BookingController.getTrainerCalendar
);

export default router;
