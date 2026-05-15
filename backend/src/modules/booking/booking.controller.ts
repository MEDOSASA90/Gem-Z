/**
 * GEM Z — Booking Controller
 *
 * Handles HTTP requests for PT session booking operations:
 * - Book, cancel, reschedule sessions
 * - Get bookings (trainee & trainer views)
 * - Calendar availability
 * - Confirm and complete sessions
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { BookingService, CreateBookingInput, BookingStatus } from './booking.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const bookingService = new BookingService(db);
const log = createLogger('booking-controller');

export class BookingController {
    // ─── Booking CRUD ─────────────────────────────────────────

    static async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const traineeId = req.user!.userId;
            const data: CreateBookingInput = {
                trainerId: req.body.trainerId,
                gymId: req.body.gymId,
                sessionType: req.body.sessionType,
                scheduledDate: req.body.scheduledDate,
                startTime: req.body.startTime,
                durationMinutes: req.body.durationMinutes,
                notes: req.body.notes,
            };

            if (!data.trainerId) {
                return next(
                    new ValidationError('trainerId is required', ErrorCode.MISSING_FIELD)
                );
            }
            if (!data.scheduledDate) {
                return next(
                    new ValidationError('scheduledDate is required', ErrorCode.MISSING_FIELD)
                );
            }
            if (!data.startTime) {
                return next(
                    new ValidationError('startTime is required', ErrorCode.MISSING_FIELD)
                );
            }
            if (!['in_person', 'online', 'group'].includes(data.sessionType)) {
                return next(
                    new ValidationError(
                        'sessionType must be: in_person, online, group',
                        ErrorCode.INVALID_INPUT
                    )
                );
            }

            const booking = await bookingService.createBooking(traineeId, data);
            res.status(201).json(success(booking, 'Session booked successfully'));
        } catch (error) {
            next(error);
        }
    }

    static async getBookings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const role = (req.query.role as 'trainee' | 'trainer') || 'trainee';
            const status = req.query.status as BookingStatus | undefined;
            const upcoming = req.query.upcoming === 'true';

            const bookings = await bookingService.getBookings(userId, role, status, upcoming);
            res.status(200).json(success(bookings, 'Bookings retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const booking = await bookingService.getBooking(id);
            res.status(200).json(success(booking, 'Booking retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Booking Actions ──────────────────────────────────────

    static async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { reason } = req.body;

            await bookingService.cancelBooking(id, userId, reason);
            res.status(200).json(success(null, 'Booking cancelled'));
        } catch (error) {
            next(error);
        }
    }

    static async rescheduleBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { scheduledDate, startTime, durationMinutes } = req.body;

            if (!scheduledDate || !startTime) {
                return next(
                    new ValidationError(
                        'scheduledDate and startTime are required',
                        ErrorCode.MISSING_FIELD
                    )
                );
            }

            const booking = await bookingService.rescheduleBooking(
                id,
                userId,
                scheduledDate,
                startTime,
                durationMinutes
            );
            res.status(200).json(success(booking, 'Booking rescheduled'));
        } catch (error) {
            next(error);
        }
    }

    static async confirmBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const trainerId = req.user!.userId;
            const { id } = req.params;

            const booking = await bookingService.confirmBooking(id, trainerId);
            res.status(200).json(success(booking, 'Booking confirmed'));
        } catch (error) {
            next(error);
        }
    }

    static async completeBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const trainerId = req.user!.userId;
            const { id } = req.params;

            const booking = await bookingService.completeBooking(id, trainerId);
            res.status(200).json(success(booking, 'Booking marked as completed'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Calendar & Availability ──────────────────────────────

    static async getTrainerAvailability(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { trainerId } = req.params;
            const { date } = req.query;

            if (!date || typeof date !== 'string') {
                return next(
                    new ValidationError('date query parameter is required', ErrorCode.MISSING_FIELD)
                );
            }

            const availability = await bookingService.getTrainerAvailability(trainerId, date);
            res.status(200).json(success(availability, 'Trainer availability retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getTrainerCalendar(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { trainerId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || typeof startDate !== 'string') {
                return next(
                    new ValidationError(
                        'startDate query parameter is required',
                        ErrorCode.MISSING_FIELD
                    )
                );
            }
            if (!endDate || typeof endDate !== 'string') {
                return next(
                    new ValidationError(
                        'endDate query parameter is required',
                        ErrorCode.MISSING_FIELD
                    )
                );
            }

            const calendar = await bookingService.getTrainerCalendar(
                trainerId,
                startDate,
                endDate
            );
            res.status(200).json(success(calendar, 'Trainer calendar retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
