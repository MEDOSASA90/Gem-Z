/**
 * GEM Z — Group Classes Booking Service
 *
 * Business logic for fitness class booking:
 * - Browse available group classes (Yoga, Zumba, Pilates, HIIT, etc.)
 * - View class schedules and instructor details
 * - Book and cancel class slots
 * - Track bookings with capacity management
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('classes-service');

// ─── Types ──────────────────────────────────────────────────────

export interface GroupClass {
    id: string;
    name: string;
    classType: string;
    description: string | null;
    instructorName: string;
    instructorAvatarUrl: string | null;
    durationMinutes: number;
    maxCapacity: number;
    calorieBurnEstimate: number | null;
    difficulty: string;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: Date;
}

export interface ClassSchedule {
    id: string;
    classId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    isActive: boolean;
}

export interface ClassBooking {
    id: string;
    userId: string;
    classId: string;
    scheduleId: string;
    bookingDate: string;
    status: 'booked' | 'attended' | 'cancelled' | 'no_show';
    checkedInAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClassWithSchedules extends GroupClass {
    schedules: (ClassSchedule & { spotsLeft: number })[];
}

// ─── Service ────────────────────────────────────────────────────

export class ClassesService {
    constructor(private pool: Pool) {}

    // ─── List Classes ─────────────────────────────────────────

    async listClasses(filters?: { classType?: string; difficulty?: string; search?: string }): Promise<GroupClass[]> {
        let query = `
            SELECT
                id, name, class_type as "classType", description,
                instructor_name as "instructorName", instructor_avatar_url as "instructorAvatarUrl",
                duration_minutes as "durationMinutes", max_capacity as "maxCapacity",
                calorie_burn_estimate as "calorieBurnEstimate", difficulty,
                image_url as "imageUrl", is_active as "isActive", created_at as "createdAt"
            FROM group_classes
            WHERE is_active = true
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (filters?.classType) {
            query += ` AND class_type = $${paramIdx}`;
            params.push(filters.classType.toLowerCase());
            paramIdx++;
        }

        if (filters?.difficulty) {
            query += ` AND difficulty = $${paramIdx}`;
            params.push(filters.difficulty.toLowerCase());
            paramIdx++;
        }

        if (filters?.search) {
            query += ` AND (name ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR instructor_name ILIKE $${paramIdx})`;
            params.push(`%${filters.search}%`);
            paramIdx++;
        }

        query += ` ORDER BY class_type, name`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    // ─── Get Class Detail ─────────────────────────────────────

    async getClassDetail(classId: string): Promise<ClassWithSchedules> {
        const classResult = await this.pool.query(
            `
            SELECT
                id, name, class_type as "classType", description,
                instructor_name as "instructorName", instructor_avatar_url as "instructorAvatarUrl",
                duration_minutes as "durationMinutes", max_capacity as "maxCapacity",
                calorie_burn_estimate as "calorieBurnEstimate", difficulty,
                image_url as "imageUrl", is_active as "isActive", created_at as "createdAt"
            FROM group_classes
            WHERE id = $1 AND is_active = true
            `,
            [classId]
        );

        if (classResult.rows.length === 0) {
            throw new NotFoundError('Class not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const schedulesResult = await this.pool.query(
            `
            SELECT
                id, class_id as "classId", day_of_week as "dayOfWeek",
                start_time as "startTime", end_time as "endTime",
                room, is_active as "isActive"
            FROM class_schedules
            WHERE class_id = $1 AND is_active = true
            ORDER BY day_of_week, start_time
            `,
            [classId]
        );

        // Get spots left for each schedule (for today + next 7 days)
        const today = new Date();
        const schedulesWithCapacity = await Promise.all(
            schedulesResult.rows.map(async (schedule) => {
                const bookingCount = await this.pool.query(
                    `
                    SELECT COUNT(*) as count
                    FROM class_bookings
                    WHERE schedule_id = $1
                        AND booking_date >= CURRENT_DATE
                        AND booking_date <= CURRENT_DATE + INTERVAL '7 days'
                        AND status = 'booked'
                    `,
                    [schedule.id]
                );
                const booked = parseInt(bookingCount.rows[0].count);
                const maxCap = classResult.rows[0].maxCapacity;
                return {
                    ...schedule,
                    spotsLeft: Math.max(0, maxCap - booked),
                };
            })
        );

        return {
            ...classResult.rows[0],
            schedules: schedulesWithCapacity,
        };
    }

    // ─── Book Class ───────────────────────────────────────────

    async bookClass(
        userId: string,
        data: { classId: string; scheduleId: string; bookingDate: string }
    ): Promise<ClassBooking> {
        const { classId, scheduleId, bookingDate } = data;

        // Verify schedule exists and belongs to class
        const scheduleResult = await this.pool.query(
            `
            SELECT cs.id, cs.class_id, cs.is_active, gc.max_capacity as "maxCapacity"
            FROM class_schedules cs
            JOIN group_classes gc ON cs.class_id = gc.id
            WHERE cs.id = $1 AND cs.class_id = $2 AND cs.is_active = true AND gc.is_active = true
            `,
            [scheduleId, classId]
        );

        if (scheduleResult.rows.length === 0) {
            throw new NotFoundError('Class schedule not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const maxCapacity = parseInt(scheduleResult.rows[0].maxCapacity);

        // Check if already booked
        const existing = await this.pool.query(
            `
            SELECT id, status FROM class_bookings
            WHERE user_id = $1 AND schedule_id = $2 AND booking_date = $3
            `,
            [userId, scheduleId, bookingDate]
        );

        if (existing.rows.length > 0 && existing.rows[0].status === 'booked') {
            throw new ConflictError('You already have a booking for this slot', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        // Check capacity
        const capacityResult = await this.pool.query(
            `
            SELECT COUNT(*) as count
            FROM class_bookings
            WHERE schedule_id = $1 AND booking_date = $2 AND status = 'booked'
            `,
            [scheduleId, bookingDate]
        );

        const bookedCount = parseInt(capacityResult.rows[0].count);
        if (bookedCount >= maxCapacity) {
            throw new ValidationError('This class is fully booked', ErrorCode.INVALID_INPUT);
        }

        // Create or update booking
        let result;
        if (existing.rows.length > 0) {
            result = await this.pool.query(
                `
                UPDATE class_bookings
                SET status = 'booked', updated_at = NOW()
                WHERE id = $1
                RETURNING
                    id, user_id as "userId", class_id as "classId", schedule_id as "scheduleId",
                    booking_date as "bookingDate", status, checked_in_at as "checkedInAt",
                    created_at as "createdAt", updated_at as "updatedAt"
                `,
                [existing.rows[0].id]
            );
        } else {
            result = await this.pool.query(
                `
                INSERT INTO class_bookings (id, user_id, class_id, schedule_id, booking_date, status)
                VALUES ($1, $2, $3, $4, $5, 'booked')
                RETURNING
                    id, user_id as "userId", class_id as "classId", schedule_id as "scheduleId",
                    booking_date as "bookingDate", status, checked_in_at as "checkedInAt",
                    created_at as "createdAt", updated_at as "updatedAt"
                `,
                [uuidv4(), userId, classId, scheduleId, bookingDate]
            );
        }

        log.info({ bookingId: result.rows[0].id, userId, classId, scheduleId }, 'Class booked');
        return result.rows[0];
    }

    // ─── Cancel Booking ───────────────────────────────────────

    async cancelBooking(bookingId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            UPDATE class_bookings
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND status = 'booked'
            RETURNING id
            `,
            [bookingId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Booking not found or already cancelled', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ bookingId, userId }, 'Class booking cancelled');
    }

    // ─── Get User Bookings ────────────────────────────────────

    async getUserBookings(userId: string): Promise<(ClassBooking & { className: string; classType: string; startTime: string; dayOfWeek: number })[]> {
        const result = await this.pool.query(
            `
            SELECT
                cb.id, cb.user_id as "userId", cb.class_id as "classId", cb.schedule_id as "scheduleId",
                cb.booking_date as "bookingDate", cb.status, cb.checked_in_at as "checkedInAt",
                cb.created_at as "createdAt", cb.updated_at as "updatedAt",
                gc.name as "className", gc.class_type as "classType",
                cs.start_time as "startTime", cs.day_of_week as "dayOfWeek"
            FROM class_bookings cb
            JOIN group_classes gc ON cb.class_id = gc.id
            JOIN class_schedules cs ON cb.schedule_id = cs.id
            WHERE cb.user_id = $1 AND cb.status IN ('booked', 'attended')
            ORDER BY cb.booking_date DESC, cs.start_time
            LIMIT 100
            `,
            [userId]
        );

        return result.rows;
    }

    // ─── Get Weekly Schedule ──────────────────────────────────

    async getWeeklySchedule(): Promise<(GroupClass & { schedules: ClassSchedule[] })[]> {
        const classesResult = await this.pool.query(
            `
            SELECT
                id, name, class_type as "classType", description,
                instructor_name as "instructorName", instructor_avatar_url as "instructorAvatarUrl",
                duration_minutes as "durationMinutes", max_capacity as "maxCapacity",
                calorie_burn_estimate as "calorieBurnEstimate", difficulty,
                image_url as "imageUrl", is_active as "isActive", created_at as "createdAt"
            FROM group_classes
            WHERE is_active = true
            ORDER BY class_type, name
            `
        );

        const result = await Promise.all(
            classesResult.rows.map(async (cls) => {
                const schedules = await this.pool.query(
                    `
                    SELECT
                        id, class_id as "classId", day_of_week as "dayOfWeek",
                        start_time as "startTime", end_time as "endTime",
                        room, is_active as "isActive"
                    FROM class_schedules
                    WHERE class_id = $1 AND is_active = true
                    ORDER BY day_of_week, start_time
                    `,
                    [cls.id]
                );
                return {
                    ...cls,
                    schedules: schedules.rows,
                };
            })
        );

        return result;
    }
}
