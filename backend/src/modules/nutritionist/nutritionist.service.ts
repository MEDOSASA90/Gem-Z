/**
 * GEM Z — Nutritionist Consultation Service
 *
 * Manages certified nutritionist profiles, session booking,
 * and video call integration (Jitsi/Zoom).
 *
 * Features:
 *   - List/search certified nutritionists
 *   - Nutritionist profile with specialties
 *   - Online session booking with calendar
 *   - Video call link generation (Jitsi/Zoom)
 *   - Session management and follow-ups
 *   - Ratings and reviews
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/i18n/errors';

const log = createLogger('nutritionist');

// ─── Types ──────────────────────────────────────────────────────

export interface Nutritionist {
    id: string;
    userId: string;
    fullName: string;
    avatarUrl?: string;
    bio?: string;
    specialties: string[];
    certifications: Array<{ name: string; year: number; issuer: string }>;
    yearsExperience: number;
    languages: string[];
    hourlyRate: number;
    currency: string;
    rating: number;
    reviewCount: number;
    totalSessions: number;
    isVerified: boolean;
    isAvailable: boolean;
    availabilitySchedule: Record<string, any>;
    videoCallProvider: 'zoom' | 'jitsi' | 'google_meet';
    meetingLink?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SessionInput {
    nutritionistId: string;
    scheduledAt: string;
    durationMinutes?: number;
    notes?: string;
    clientGoals?: string;
}

export interface NutritionistSession {
    id: string;
    nutritionistId: string;
    nutritionistName?: string;
    nutritionistAvatar?: string;
    clientId: string;
    clientName?: string;
    scheduledAt: Date;
    durationMinutes: number;
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    clientGoals?: string;
    mealPlanSent: boolean;
    followUpDate?: Date;
    videoCallUrl?: string;
    recordingUrl?: string;
    ratingGiven?: number;
    clientReview?: string;
    amountPaid?: number;
    currency: string;
    paymentStatus: 'pending' | 'paid' | 'refunded';
    createdAt: Date;
    updatedAt: Date;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * List certified nutritionists with optional filters.
 */
export async function listNutritionists(filters?: {
    specialty?: string;
    language?: string;
    verified?: boolean;
    available?: boolean;
    minRating?: number;
    maxRate?: number;
    limit?: number;
    offset?: number;
}): Promise<{ nutritionists: Nutritionist[]; total: number }> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    let whereClause = 'WHERE n.is_verified = TRUE';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.specialty) {
        whereClause += ` AND $${paramIndex++} = ANY(n.specialties)`;
        params.push(filters.specialty);
    }
    if (filters?.language) {
        whereClause += ` AND $${paramIndex++} = ANY(n.languages)`;
        params.push(filters.language);
    }
    if (filters?.verified !== undefined) {
        whereClause += ` AND n.is_verified = $${paramIndex++}`;
        params.push(filters.verified);
    }
    if (filters?.available !== undefined) {
        whereClause += ` AND n.is_available = $${paramIndex++}`;
        params.push(filters.available);
    }
    if (filters?.minRating !== undefined) {
        whereClause += ` AND n.rating >= $${paramIndex++}`;
        params.push(filters.minRating);
    }
    if (filters?.maxRate !== undefined) {
        whereClause += ` AND n.hourly_rate <= $${paramIndex++}`;
        params.push(filters.maxRate);
    }

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM nutritionists n ${whereClause}`,
        params
    );

    const { rows } = await db.query(
        `
        SELECT n.*, u.full_name, u.avatar_url
        FROM nutritionists n
        JOIN users u ON n.user_id = u.id
        ${whereClause}
        ORDER BY n.rating DESC, n.total_sessions DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    return {
        nutritionists: rows.map(mapNutritionistRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * Get a single nutritionist by ID.
 */
export async function getNutritionistById(id: string): Promise<Nutritionist> {
    const { rows } = await db.query(
        `
        SELECT n.*, u.full_name, u.avatar_url
        FROM nutritionists n
        JOIN users u ON n.user_id = u.id
        WHERE n.id = $1
        `,
        [id]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Nutritionist not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    return mapNutritionistRow(rows[0]);
}

/**
 * Book an online session with a nutritionist.
 */
export async function bookSession(
    clientId: string,
    input: SessionInput
): Promise<NutritionistSession> {
    // Verify nutritionist exists and is available
    const nutritionist = await getNutritionistById(input.nutritionistId);

    if (!nutritionist.isAvailable) {
        throw new ValidationError('Nutritionist is not currently available', ErrorCode.INVALID_INPUT);
    }

    const scheduledAt = new Date(input.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new ValidationError('scheduledAt must be a future date', ErrorCode.INVALID_INPUT);
    }

    // Check for scheduling conflicts (simplified: 1-hour buffer)
    const { rows: conflictRows } = await db.query(
        `
        SELECT 1 FROM nutritionist_sessions
        WHERE nutritionist_id = $1
        AND status NOT IN ('cancelled', 'no_show')
        AND scheduled_at BETWEEN $2 AND $3
        `,
        [
            input.nutritionistId,
            new Date(scheduledAt.getTime() - 30 * 60 * 1000),
            new Date(scheduledAt.getTime() + 30 * 60 * 1000),
        ]
    );

    if (conflictRows.length > 0) {
        throw new ConflictError(
            'Nutritionist is not available at this time. Please choose a different time.',
            ErrorCode.CONFLICT_DUPLICATE_RESOURCE
        );
    }

    // Generate video call URL
    const durationMinutes = input.durationMinutes || 60;
    const videoCallUrl = generateVideoCallUrl(
        nutritionist.videoCallProvider,
        input.nutritionistId,
        clientId,
        scheduledAt
    );

    const amountPaid = nutritionist.hourlyRate * (durationMinutes / 60);

    const { rows } = await db.query(
        `
        INSERT INTO nutritionist_sessions (
            nutritionist_id, client_id, scheduled_at, duration_minutes,
            notes, client_goals, video_call_url, amount_paid, currency,
            status, payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', 'pending')
        RETURNING *,
            (SELECT full_name FROM users WHERE id = $1) as nutritionist_name,
            (SELECT avatar_url FROM users WHERE id = $1) as nutritionist_avatar,
            (SELECT full_name FROM users WHERE id = $2) as client_name
        `,
        [
            input.nutritionistId,
            clientId,
            scheduledAt,
            durationMinutes,
            input.notes || null,
            input.clientGoals || null,
            videoCallUrl,
            amountPaid,
            nutritionist.currency,
        ]
    );

    const session = mapSessionRow(rows[0]);

    log.info({ sessionId: session.id, nutritionistId: input.nutritionistId, clientId }, 'Session booked');
    logAudit('nutritionist_session_booked', {
        userId: clientId,
        resource: session.id,
        result: 'success',
        nutritionistId: input.nutritionistId,
    });

    return session;
}

/**
 * List sessions for a client.
 */
export async function listClientSessions(
    clientId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ sessions: NutritionistSession[]; total: number }> {
    let whereClause = 'WHERE ns.client_id = $1';
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (status) {
        whereClause += ` AND ns.status = $${paramIndex++}`;
        params.push(status);
    }

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM nutritionist_sessions ns ${whereClause}`,
        params
    );

    const { rows } = await db.query(
        `
        SELECT ns.*,
               n.full_name as nutritionist_name,
               n.avatar_url as nutritionist_avatar,
               u.full_name as client_name
        FROM nutritionist_sessions ns
        JOIN nutritionists n ON ns.nutritionist_id = n.id
        JOIN users u ON ns.client_id = u.id
        ${whereClause}
        ORDER BY ns.scheduled_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    return {
        sessions: rows.map(mapSessionRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * List sessions for a nutritionist.
 */
export async function listNutritionistSessions(
    nutritionistUserId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
): Promise<{ sessions: NutritionistSession[]; total: number }> {
    // Get nutritionist record for this user
    const { rows: nRows } = await db.query(
        `SELECT id FROM nutritionists WHERE user_id = $1`,
        [nutritionistUserId]
    );
    if (nRows.length === 0) {
        throw new NotFoundError('Nutritionist profile not found', ErrorCode.NOT_FOUND_RESOURCE);
    }
    const nutritionistId = nRows[0].id;

    let whereClause = 'WHERE ns.nutritionist_id = $1';
    const params: any[] = [nutritionistId];
    let paramIndex = 2;

    if (status) {
        whereClause += ` AND ns.status = $${paramIndex++}`;
        params.push(status);
    }

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM nutritionist_sessions ns ${whereClause}`,
        params
    );

    const { rows } = await db.query(
        `
        SELECT ns.*,
               n.full_name as nutritionist_name,
               n.avatar_url as nutritionist_avatar,
               u.full_name as client_name
        FROM nutritionist_sessions ns
        JOIN nutritionists n ON ns.nutritionist_id = n.id
        JOIN users u ON ns.client_id = u.id
        ${whereClause}
        ORDER BY ns.scheduled_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    return {
        sessions: rows.map(mapSessionRow),
        total: parseInt(countRows[0].total),
    };
}

/**
 * Update session status.
 */
export async function updateSessionStatus(
    sessionId: string,
    userId: string,
    status: string,
    updates?: { mealPlanSent?: boolean; followUpDate?: string; notes?: string }
): Promise<NutritionistSession> {
    const allowedStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!allowedStatuses.includes(status)) {
        throw new ValidationError(`Status must be one of: ${allowedStatuses.join(', ')}`, ErrorCode.INVALID_INPUT);
    }

    // Verify ownership
    const { rows: checkRows } = await db.query(
        `
        SELECT ns.* FROM nutritionist_sessions ns
        JOIN nutritionists n ON ns.nutritionist_id = n.id
        WHERE ns.id = $1 AND (ns.client_id = $2 OR n.user_id = $2)
        `,
        [sessionId, userId]
    );

    if (checkRows.length === 0) {
        throw new NotFoundError('Session not found or access denied', ErrorCode.NOT_FOUND_RESOURCE);
    }

    // Build dynamic update
    const setParts = ['status = $1'];
    const params: any[] = [status];
    let paramIndex = 2;

    if (updates?.mealPlanSent !== undefined) {
        setParts.push(`meal_plan_sent = $${paramIndex++}`);
        params.push(updates.mealPlanSent);
    }
    if (updates?.followUpDate) {
        setParts.push(`follow_up_date = $${paramIndex++}`);
        params.push(new Date(updates.followUpDate));
    }
    if (updates?.notes) {
        setParts.push(`notes = COALESCE(notes, '') || E'\\n' || $${paramIndex++}`);
        params.push(updates.notes);
    }

    params.push(sessionId);

    const { rows } = await db.query(
        `
        UPDATE nutritionist_sessions
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *,
            (SELECT full_name FROM nutritionists WHERE id = nutritionist_sessions.nutritionist_id) as nutritionist_name,
            (SELECT avatar_url FROM nutritionists WHERE id = nutritionist_sessions.nutritionist_id) as nutritionist_avatar,
            (SELECT full_name FROM users WHERE id = nutritionist_sessions.client_id) as client_name
        `,
        params
    );

    return mapSessionRow(rows[0]);
}

/**
 * Submit a review/rating for a completed session.
 */
export async function submitReview(
    sessionId: string,
    clientId: string,
    rating: number,
    review?: string
): Promise<void> {
    if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5', ErrorCode.INVALID_INPUT);
    }

    const { rows } = await db.query(
        `
        UPDATE nutritionist_sessions
        SET rating_given = $1, client_review = $2, updated_at = NOW()
        WHERE id = $3 AND client_id = $4 AND status = 'completed'
        RETURNING nutritionist_id
        `,
        [rating, review || null, sessionId, clientId]
    );

    if (rows.length === 0) {
        throw new ValidationError('Session not found or not eligible for review', ErrorCode.NOT_FOUND_RESOURCE);
    }

    // Recalculate nutritionist average rating
    const nutritionistId = rows[0].nutritionist_id;
    await db.query(
        `
        UPDATE nutritionists
        SET rating = (
            SELECT COALESCE(AVG(rating_given), 5)
            FROM nutritionist_sessions
            WHERE nutritionist_id = $1 AND rating_given IS NOT NULL
        ),
        review_count = (
            SELECT COUNT(*) FROM nutritionist_sessions
            WHERE nutritionist_id = $1 AND rating_given IS NOT NULL
        ),
        updated_at = NOW()
        WHERE id = $1
        `,
        [nutritionistId]
    );
}

// ─── Helpers ────────────────────────────────────────────────────

function generateVideoCallUrl(
    provider: string,
    nutritionistId: string,
    clientId: string,
    scheduledAt: Date
): string {
    const timestamp = scheduledAt.getTime();
    const roomId = Buffer.from(`${nutritionistId}-${clientId}-${timestamp}`).toString('base64url');

    switch (provider) {
        case 'jitsi':
            return `https://meet.jit.si/gemz-${roomId}`;
        case 'zoom':
            // Would integrate with Zoom API in production
            return `https://zoom.us/j/${Math.abs(timestamp).toString(36)}-${roomId.slice(0, 8)}`;
        case 'google_meet':
            return `https://meet.google.com/${roomId.slice(0, 3)}-${roomId.slice(3, 7)}-${roomId.slice(7, 10)}`;
        default:
            return `https://meet.jit.si/gemz-${roomId}`;
    }
}

function mapNutritionistRow(row: any): Nutritionist {
    let certifications: Array<{ name: string; year: number; issuer: string }> = [];
    try {
        certifications = Array.isArray(row.certifications)
            ? row.certifications
            : JSON.parse(row.certifications || '[]');
    } catch {
        certifications = [];
    }

    let availabilitySchedule: Record<string, any> = {};
    try {
        availabilitySchedule = typeof row.availability_schedule === 'string'
            ? JSON.parse(row.availability_schedule || '{}')
            : row.availability_schedule || {};
    } catch {
        availabilitySchedule = {};
    }

    return {
        id: String(row.id),
        userId: String(row.user_id),
        fullName: row.full_name || row.fullName,
        avatarUrl: row.avatar_url || row.avatarUrl,
        bio: row.bio,
        specialties: row.specialties || [],
        certifications,
        yearsExperience: parseInt(row.years_experience || row.yearsExperience || 0),
        languages: row.languages || ['en'],
        hourlyRate: parseFloat(row.hourly_rate || row.hourlyRate || 0),
        currency: row.currency || 'USD',
        rating: parseFloat(row.rating || 5),
        reviewCount: parseInt(row.review_count || row.reviewCount || 0),
        totalSessions: parseInt(row.total_sessions || row.totalSessions || 0),
        isVerified: row.is_verified ?? row.isVerified ?? false,
        isAvailable: row.is_available ?? row.isAvailable ?? true,
        availabilitySchedule,
        videoCallProvider: row.video_call_provider || row.videoCallProvider || 'jitsi',
        meetingLink: row.meeting_link || row.meetingLink,
        createdAt: new Date(row.created_at || row.createdAt),
        updatedAt: new Date(row.updated_at || row.updatedAt),
    };
}

function mapSessionRow(row: any): NutritionistSession {
    return {
        id: String(row.id),
        nutritionistId: String(row.nutritionist_id),
        nutritionistName: row.nutritionist_name || row.nutritionistName,
        nutritionistAvatar: row.nutritionist_avatar || row.nutritionistAvatar,
        clientId: String(row.client_id),
        clientName: row.client_name || row.clientName,
        scheduledAt: new Date(row.scheduled_at),
        durationMinutes: parseInt(row.duration_minutes || 60),
        status: row.status,
        notes: row.notes,
        clientGoals: row.client_goals,
        mealPlanSent: row.meal_plan_sent ?? false,
        followUpDate: row.follow_up_date ? new Date(row.follow_up_date) : undefined,
        videoCallUrl: row.video_call_url,
        recordingUrl: row.recording_url,
        ratingGiven: row.rating_given ? parseFloat(row.rating_given) : undefined,
        clientReview: row.client_review,
        amountPaid: row.amount_paid ? parseFloat(row.amount_paid) : undefined,
        currency: row.currency || 'USD',
        paymentStatus: row.payment_status || 'pending',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
