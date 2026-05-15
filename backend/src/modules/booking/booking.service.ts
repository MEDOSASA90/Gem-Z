/**
 * GEM Z — PT Booking Service
 *
 * Business logic for personal training session booking:
 * - Session booking, cancellation, and rescheduling
 * - Trainer availability and calendar management
 * - Booking reminders and notifications
 * - Session history and upcoming sessions
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('booking-service');

// ─── Types ──────────────────────────────────────────────────────

export type BookingStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'no_show';
export type SessionType = 'in_person' | 'online' | 'group';

export interface Booking {
    id: string;
    traineeId: string;
    traineeName?: string;
    trainerId: string;
    trainerName?: string;
    gymId: string | null;
    gymName?: string | null;
    status: BookingStatus;
    sessionType: SessionType;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    notes: string | null;
    price: number;
    priceUnit: string;
    reminderSent: boolean;
    cancelledBy: string | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookingId?: string;
}

export interface TrainerAvailability {
    trainerId: string;
    trainerName: string;
    dayOfWeek: number; // 0-6 (Sun-Sat)
    slots: TimeSlot[];
}

export interface CreateBookingInput {
    trainerId: string;
    gymId?: string;
    sessionType: SessionType;
    scheduledDate: string;
    startTime: string;
    durationMinutes?: number;
    notes?: string;
}

export interface TrainerCalendarDay {
    date: string;
    dayOfWeek: number;
    isAvailable: boolean;
    slots: TimeSlot[];
}

// ─── Service ────────────────────────────────────────────────────

export class BookingService {
    constructor(private pool: Pool) {}

    // ─── Booking CRUD ─────────────────────────────────────────

    /**
     * Book a PT session.
     */
    async createBooking(
        traineeId: string,
        data: CreateBookingInput
    ): Promise<Booking> {
        // Validate trainer exists
        const trainerResult = await this.pool.query(
            `SELECT id, full_name, hourly_rate, session_duration_default FROM users WHERE id = $1 AND role = 'trainer'`,
            [data.trainerId]
        );
        if (trainerResult.rows.length === 0) {
            throw new NotFoundError('Trainer not found', ErrorCode.NOT_FOUND_USER);
        }
        const trainer = trainerResult.rows[0];

        // Validate session date
        const scheduledDate = new Date(data.scheduledDate);
        if (isNaN(scheduledDate.getTime())) {
            throw new ValidationError('Invalid scheduled date', ErrorCode.INVALID_INPUT);
        }

        // Must be in the future
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (scheduledDate < now) {
            throw new ValidationError(
                'Cannot book sessions in the past',
                ErrorCode.INVALID_INPUT
            );
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(data.startTime)) {
            throw new ValidationError(
                'Invalid start time format. Use HH:mm',
                ErrorCode.INVALID_INPUT
            );
        }

        const durationMinutes = data.durationMinutes || trainer.session_duration_default || 60;
        const endTime = this.addMinutes(data.startTime, durationMinutes);
        const price = trainer.hourly_rate * (durationMinutes / 60);

        // Check for conflicts
        const conflictCheck = await this.pool.query(
            `
            SELECT 1 FROM bookings
            WHERE trainer_id = $1
              AND scheduled_date = $2
              AND status IN ('pending', 'confirmed')
              AND (
                  (start_time <= $3 AND end_time > $3)
                  OR (start_time < $4 AND end_time >= $4)
                  OR (start_time >= $3 AND end_time <= $4)
              )
            LIMIT 1
            `,
            [data.trainerId, scheduledDate, data.startTime, endTime]
        );
        if (conflictCheck.rows.length > 0) {
            throw new ConflictError(
                'Trainer is not available at this time',
                ErrorCode.CONFLICT_DUPLICATE_RESOURCE
            );
        }

        // Check trainee doesn't have overlapping booking
        const traineeConflict = await this.pool.query(
            `
            SELECT 1 FROM bookings
            WHERE trainee_id = $1
              AND scheduled_date = $2
              AND status IN ('pending', 'confirmed')
              AND (
                  (start_time <= $3 AND end_time > $3)
                  OR (start_time < $4 AND end_time >= $4)
                  OR (start_time >= $3 AND end_time <= $4)
              )
            LIMIT 1
            `,
            [traineeId, scheduledDate, data.startTime, endTime]
        );
        if (traineeConflict.rows.length > 0) {
            throw new ConflictError(
                'You have another session at this time',
                ErrorCode.CONFLICT_DUPLICATE_RESOURCE
            );
        }

        const bookingId = uuidv4();

        try {
            const result = await this.pool.query(
                `
                INSERT INTO bookings (
                    id, trainee_id, trainer_id, gym_id, status,
                    session_type, scheduled_date, start_time, end_time,
                    duration_minutes, notes, price, price_unit
                )
                VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, 'EGP')
                RETURNING
                    id,
                    trainee_id as "traineeId",
                    trainer_id as "trainerId",
                    gym_id as "gymId",
                    status,
                    session_type as "sessionType",
                    scheduled_date as "scheduledDate",
                    start_time as "startTime",
                    end_time as "endTime",
                    duration_minutes as "durationMinutes",
                    notes,
                    price,
                    price_unit as "priceUnit",
                    reminder_sent as "reminderSent",
                    cancelled_by as "cancelledBy",
                    cancellation_reason as "cancellationReason",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [
                    bookingId,
                    traineeId,
                    data.trainerId,
                    data.gymId || null,
                    data.sessionType,
                    scheduledDate,
                    data.startTime,
                    endTime,
                    durationMinutes,
                    data.notes || null,
                    Math.round(price * 100) / 100,
                ]
            );

            const booking = result.rows[0];
            booking.trainerName = trainer.full_name;

            log.info(
                { bookingId, traineeId, trainerId: data.trainerId, date: data.scheduledDate },
                'PT session booked'
            );
            return booking;
        } catch (error) {
            log.error({ error, traineeId, trainerId: data.trainerId }, 'Failed to create booking');
            throw new AppError('Failed to create booking', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Get user's bookings (trainee or trainer).
     */
    async getBookings(
        userId: string,
        role: 'trainee' | 'trainer' = 'trainee',
        status?: BookingStatus,
        upcoming: boolean = false
    ): Promise<Booking[]> {
        const field = role === 'trainee' ? 'trainee_id' : 'trainer_id';

        const conditions: string[] = [`b.${field} = $1`];
        const values: any[] = [userId];
        let paramIdx = 2;

        if (status) {
            conditions.push(`b.status = $${paramIdx}`);
            values.push(status);
            paramIdx++;
        }

        if (upcoming) {
            conditions.push(`b.scheduled_date >= CURRENT_DATE`);
            conditions.push(`b.status IN ('pending', 'confirmed')`);
        }

        const result = await this.pool.query(
            `
            SELECT
                b.id,
                b.trainee_id as "traineeId",
                tu.full_name as "traineeName",
                b.trainer_id as "trainerId",
                tru.full_name as "trainerName",
                b.gym_id as "gymId",
                g.name as "gymName",
                b.status,
                b.session_type as "sessionType",
                b.scheduled_date as "scheduledDate",
                b.start_time as "startTime",
                b.end_time as "endTime",
                b.duration_minutes as "durationMinutes",
                b.notes,
                b.price,
                b.price_unit as "priceUnit",
                b.reminder_sent as "reminderSent",
                b.cancelled_by as "cancelledBy",
                b.cancellation_reason as "cancellationReason",
                b.created_at as "createdAt",
                b.updated_at as "updatedAt"
            FROM bookings b
            JOIN users tu ON b.trainee_id = tu.id
            JOIN users tru ON b.trainer_id = tru.id
            LEFT JOIN gyms g ON b.gym_id = g.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY b.scheduled_date ASC, b.start_time ASC
            LIMIT 100
            `,
            values
        );

        return result.rows;
    }

    /**
     * Get single booking details.
     */
    async getBooking(bookingId: string): Promise<Booking> {
        const result = await this.pool.query(
            `
            SELECT
                b.id,
                b.trainee_id as "traineeId",
                tu.full_name as "traineeName",
                b.trainer_id as "trainerId",
                tru.full_name as "trainerName",
                b.gym_id as "gymId",
                g.name as "gymName",
                b.status,
                b.session_type as "sessionType",
                b.scheduled_date as "scheduledDate",
                b.start_time as "startTime",
                b.end_time as "endTime",
                b.duration_minutes as "durationMinutes",
                b.notes,
                b.price,
                b.price_unit as "priceUnit",
                b.reminder_sent as "reminderSent",
                b.cancelled_by as "cancelledBy",
                b.cancellation_reason as "cancellationReason",
                b.created_at as "createdAt",
                b.updated_at as "updatedAt"
            FROM bookings b
            JOIN users tu ON b.trainee_id = tu.id
            JOIN users tru ON b.trainer_id = tru.id
            LEFT JOIN gyms g ON b.gym_id = g.id
            WHERE b.id = $1
            `,
            [bookingId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Booking not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        return result.rows[0];
    }

    /**
     * Cancel a booking.
     */
    async cancelBooking(
        bookingId: string,
        userId: string,
        reason?: string
    ): Promise<void> {
        const booking = await this.getBooking(bookingId);

        if (booking.status === 'cancelled' || booking.status === 'completed') {
            throw new ValidationError(
                'Cannot cancel a completed or already cancelled booking',
                ErrorCode.INVALID_INPUT
            );
        }

        // Check if user is trainee or trainer for this booking
        if (booking.traineeId !== userId && booking.trainerId !== userId) {
            throw new ForbiddenError(
                'Only the trainee or trainer can cancel this booking',
                ErrorCode.FORBIDDEN_RESOURCE_ACCESS
            );
        }

        await this.pool.query(
            `
            UPDATE bookings
            SET
                status = 'cancelled',
                cancelled_by = $2,
                cancellation_reason = $3,
                updated_at = NOW()
            WHERE id = $1
            `,
            [bookingId, userId, reason || null]
        );

        log.info({ bookingId, cancelledBy: userId, reason }, 'Booking cancelled');
    }

    /**
     * Reschedule a booking.
     */
    async rescheduleBooking(
        bookingId: string,
        userId: string,
        newDate: string,
        newStartTime: string,
        newDurationMinutes?: number
    ): Promise<Booking> {
        const booking = await this.getBooking(bookingId);

        if (booking.traineeId !== userId) {
            throw new ForbiddenError(
                'Only the trainee can reschedule',
                ErrorCode.FORBIDDEN_RESOURCE_ACCESS
            );
        }

        if (booking.status === 'cancelled' || booking.status === 'completed') {
            throw new ValidationError(
                'Cannot reschedule a completed or cancelled booking',
                ErrorCode.INVALID_INPUT
            );
        }

        const scheduledDate = new Date(newDate);
        if (isNaN(scheduledDate.getTime())) {
            throw new ValidationError('Invalid date', ErrorCode.INVALID_INPUT);
        }

        const duration = newDurationMinutes || booking.durationMinutes;
        const endTime = this.addMinutes(newStartTime, duration);

        // Check trainer availability
        const conflictCheck = await this.pool.query(
            `
            SELECT 1 FROM bookings
            WHERE trainer_id = $1
              AND id != $2
              AND scheduled_date = $3
              AND status IN ('pending', 'confirmed')
              AND (
                  (start_time <= $4 AND end_time > $4)
                  OR (start_time < $5 AND end_time >= $5)
                  OR (start_time >= $4 AND end_time <= $5)
              )
            LIMIT 1
            `,
            [booking.trainerId, bookingId, scheduledDate, newStartTime, endTime]
        );
        if (conflictCheck.rows.length > 0) {
            throw new ConflictError(
                'Trainer is not available at the new time',
                ErrorCode.CONFLICT_DUPLICATE_RESOURCE
            );
        }

        const result = await this.pool.query(
            `
            UPDATE bookings
            SET
                scheduled_date = $3,
                start_time = $4,
                end_time = $5,
                duration_minutes = $6,
                status = 'pending',
                updated_at = NOW()
            WHERE id = $1 AND trainee_id = $2
            RETURNING
                id,
                trainee_id as "traineeId",
                trainer_id as "trainerId",
                gym_id as "gymId",
                status,
                session_type as "sessionType",
                scheduled_date as "scheduledDate",
                start_time as "startTime",
                end_time as "endTime",
                duration_minutes as "durationMinutes",
                notes,
                price,
                price_unit as "priceUnit",
                reminder_sent as "reminderSent",
                cancelled_by as "cancelledBy",
                cancellation_reason as "cancellationReason",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            [bookingId, userId, scheduledDate, newStartTime, endTime, duration]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Booking not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ bookingId, newDate, newStartTime }, 'Booking rescheduled');
        return result.rows[0];
    }

    /**
     * Confirm a booking (trainer action).
     */
    async confirmBooking(bookingId: string, trainerId: string): Promise<Booking> {
        const booking = await this.getBooking(bookingId);

        if (booking.trainerId !== trainerId) {
            throw new ForbiddenError(
                'Only the assigned trainer can confirm',
                ErrorCode.FORBIDDEN_RESOURCE_ACCESS
            );
        }

        if (booking.status !== 'pending') {
            throw new ValidationError(
                'Only pending bookings can be confirmed',
                ErrorCode.INVALID_INPUT
            );
        }

        const result = await this.pool.query(
            `
            UPDATE bookings
            SET status = 'confirmed', updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                trainee_id as "traineeId",
                trainer_id as "trainerId",
                gym_id as "gymId",
                status,
                session_type as "sessionType",
                scheduled_date as "scheduledDate",
                start_time as "startTime",
                end_time as "endTime",
                duration_minutes as "durationMinutes",
                notes,
                price,
                price_unit as "priceUnit",
                reminder_sent as "reminderSent",
                cancelled_by as "cancelledBy",
                cancellation_reason as "cancellationReason",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            [bookingId]
        );

        log.info({ bookingId, trainerId }, 'Booking confirmed');
        return result.rows[0];
    }

    // ─── Calendar & Availability ──────────────────────────────

    /**
     * Get trainer's available time slots for a given date.
     */
    async getTrainerAvailability(
        trainerId: string,
        date: string
    ): Promise<TrainerCalendarDay> {
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            throw new ValidationError('Invalid date', ErrorCode.INVALID_INPUT);
        }

        const dayOfWeek = targetDate.getDay();

        // Get trainer's working hours
        const trainerResult = await this.pool.query(
            `
            SELECT
                id,
                full_name as "trainerName",
                working_hours as "workingHours"
            FROM users
            WHERE id = $1 AND role = 'trainer'
            `,
            [trainerId]
        );

        if (trainerResult.rows.length === 0) {
            throw new NotFoundError('Trainer not found', ErrorCode.NOT_FOUND_USER);
        }

        const trainer = trainerResult.rows[0];

        // Get existing bookings for this date
        const bookingsResult = await this.pool.query(
            `
            SELECT
                start_time as "startTime",
                end_time as "endTime"
            FROM bookings
            WHERE trainer_id = $1
              AND scheduled_date = $2
              AND status IN ('pending', 'confirmed')
            ORDER BY start_time ASC
            `,
            [trainerId, targetDate]
        );

        // Generate time slots (assuming 9 AM to 9 PM, 1-hour slots)
        const workingHours = trainer.workingHours || {
            start: '09:00',
            end: '21:00',
            slotMinutes: 60,
        };

        const bookedSlots = bookingsResult.rows;
        const slots: TimeSlot[] = [];

        let currentTime = workingHours.start || '09:00';
        const endTime = workingHours.end || '21:00';
        const slotMinutes = workingHours.slotMinutes || 60;

        while (this.timeToMinutes(currentTime) < this.timeToMinutes(endTime)) {
            const slotEnd = this.addMinutes(currentTime, slotMinutes);
            const isBooked = bookedSlots.some(
                (b: any) =>
                    this.timeToMinutes(b.startTime) < this.timeToMinutes(slotEnd) &&
                    this.timeToMinutes(b.endTime) > this.timeToMinutes(currentTime)
            );

            slots.push({
                startTime: currentTime,
                endTime: slotEnd,
                isAvailable: !isBooked,
            });

            currentTime = slotEnd;
        }

        return {
            date,
            dayOfWeek,
            isAvailable: slots.some((s) => s.isAvailable),
            slots,
        };
    }

    /**
     * Get trainer's calendar for a date range.
     */
    async getTrainerCalendar(
        trainerId: string,
        startDate: string,
        endDate: string
    ): Promise<TrainerCalendarDay[]> {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ValidationError('Invalid date range', ErrorCode.INVALID_INPUT);
        }

        if (end < start) {
            throw new ValidationError(
                'End date must be after start date',
                ErrorCode.INVALID_INPUT
            );
        }

        const maxRangeDays = 60;
        const diffDays =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > maxRangeDays) {
            throw new ValidationError(
                `Date range cannot exceed ${maxRangeDays} days`,
                ErrorCode.INVALID_INPUT
            );
        }

        const days: TrainerCalendarDay[] = [];
        const current = new Date(start);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const dayData = await this.getTrainerAvailability(trainerId, dateStr);
            days.push(dayData);
            current.setDate(current.getDate() + 1);
        }

        return days;
    }

    /**
     * Mark a booking as completed (after the session time).
     */
    async completeBooking(bookingId: string, trainerId: string): Promise<Booking> {
        const booking = await this.getBooking(bookingId);

        if (booking.trainerId !== trainerId) {
            throw new ForbiddenError(
                'Only the assigned trainer can mark as completed',
                ErrorCode.FORBIDDEN_RESOURCE_ACCESS
            );
        }

        const result = await this.pool.query(
            `
            UPDATE bookings
            SET status = 'completed', updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                trainee_id as "traineeId",
                trainer_id as "trainerId",
                gym_id as "gymId",
                status,
                session_type as "sessionType",
                scheduled_date as "scheduledDate",
                start_time as "startTime",
                end_time as "endTime",
                duration_minutes as "durationMinutes",
                notes,
                price,
                price_unit as "priceUnit",
                reminder_sent as "reminderSent",
                cancelled_by as "cancelledBy",
                cancellation_reason as "cancellationReason",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            [bookingId]
        );

        log.info({ bookingId }, 'Booking marked as completed');
        return result.rows[0];
    }

    // ─── Reminders ────────────────────────────────────────────

    /**
     * Send reminders for upcoming sessions (called by cron job).
     */
    async sendReminders(hoursAhead: number = 24): Promise<number> {
        const result = await this.pool.query(
            `
            SELECT
                b.id,
                b.trainee_id as "traineeId",
                b.trainer_id as "trainerId",
                b.scheduled_date as "scheduledDate",
                b.start_time as "startTime",
                u.full_name as "traineeName",
                tu.full_name as "trainerName"
            FROM bookings b
            JOIN users u ON b.trainee_id = u.id
            JOIN users tu ON b.trainer_id = tu.id
            WHERE b.status = 'confirmed'
              AND b.reminder_sent = FALSE
              AND (
                  b.scheduled_date + b.start_time::time
                  BETWEEN NOW() AND NOW() + INTERVAL '${hoursAhead} hours'
              )
            LIMIT 100
            `
        );

        let sent = 0;
        for (const row of result.rows) {
            // Mark as sent
            await this.pool.query(
                `UPDATE bookings SET reminder_sent = TRUE WHERE id = $1`,
                [row.id]
            );
            sent++;

            log.info(
                { bookingId: row.id, traineeId: row.traineeId },
                'Reminder sent for upcoming session'
            );
        }

        return sent;
    }

    // ─── Helpers ──────────────────────────────────────────────

    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private addMinutes(time: string, minutes: number): string {
        const total = this.timeToMinutes(time) + minutes;
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
}
