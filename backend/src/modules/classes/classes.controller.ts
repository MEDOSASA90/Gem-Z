/**
 * GEM Z — Group Classes Booking Controller
 *
 * Handles class browsing, booking, and schedule management.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { ClassesService } from './classes.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const classesService = new ClassesService(db);
const log = createLogger('classes-controller');

export class ClassesController {
    /**
     * GET /api/v1/classes
     * List all available group classes.
     */
    static async listClasses(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { class_type, difficulty, search } = req.query;
            const classes = await classesService.listClasses({
                classType: class_type as string | undefined,
                difficulty: difficulty as string | undefined,
                search: search as string | undefined,
            });
            res.status(200).json(success(classes, 'Classes retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/classes/schedule
     * Get weekly class schedule.
     */
    static async getWeeklySchedule(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const schedule = await classesService.getWeeklySchedule();
            res.status(200).json(success(schedule, 'Weekly schedule retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/classes/:id
     * Get class detail with schedules.
     */
    static async getClassDetail(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const classDetail = await classesService.getClassDetail(id);
            res.status(200).json(success(classDetail, 'Class detail retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/classes/book
     * Book a class.
     */
    static async bookClass(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { class_id, schedule_id, booking_date } = req.body;

            log.info({ userId, classId: class_id }, 'Booking class');

            const booking = await classesService.bookClass(userId, {
                classId: class_id,
                scheduleId: schedule_id,
                bookingDate: booking_date,
            });

            res.status(201).json(success(booking, 'Class booked'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/classes/cancel/:bookingId
     * Cancel a class booking.
     */
    static async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { bookingId } = req.params;

            await classesService.cancelBooking(bookingId, userId);
            res.status(200).json(success(null, 'Booking cancelled'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/classes/bookings
     * Get user's bookings.
     */
    static async getUserBookings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const bookings = await classesService.getUserBookings(userId);
            res.status(200).json(success(bookings, 'Bookings retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
