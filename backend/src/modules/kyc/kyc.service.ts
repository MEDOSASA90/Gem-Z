/**
 * GEM Z — KYC (Know Your Customer) Service
 *
 * Handles identity verification:
 *   - Submit KYC documents
 *   - Check KYC status
 *   - Resubmit after rejection
 *   - Admin review workflow (list, detail, approve, reject)
 *
 * Status flow: pending → under_review → approved | rejected → resubmitted
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('kyc');

// ─── Types ──────────────────────────────────────────────────────

export type KycStatus =
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'resubmitted';

export type KycDocumentType =
    | 'national_id_front'
    | 'national_id_back'
    | 'passport'
    | 'driver_license'
    | 'selfie'
    | 'proof_of_address';

export interface KycDocument {
    id: string;
    type: KycDocumentType;
    url: string;
    uploadedAt: Date;
}

export interface KycSubmission {
    id: string;
    userId: string;
    status: KycStatus;
    fullName: string;
    nationalId: string | null;
    dateOfBirth: Date | null;
    address: string | null;
    city: string | null;
    documents: KycDocument[];
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
    notes: string | null;
    resubmissionCount: number;
}

export interface KycSubmissionInput {
    fullName: string;
    nationalId?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    documents: {
        type: KycDocumentType;
        url: string;
    }[];
}

export interface KycStatusResponse {
    status: KycStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    resubmissionCount: number;
    isVerified: boolean;
}

export interface KycReviewInput {
    status: 'approved' | 'rejected';
    rejectionReason?: string;
    notes?: string;
    reviewedBy: string;
}

// ─── Submission ─────────────────────────────────────────────────

/**
 * Submit a new KYC application.
 */
export async function submitKyc(
    userId: string,
    input: KycSubmissionInput
): Promise<KycSubmission> {
    // Check if user already has a pending/approved submission
    const existing = await db.query(
        'SELECT status FROM kyc_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1',
        [userId]
    );

    if (existing.rows.length > 0) {
        const status = existing.rows[0].status as KycStatus;
        if (status === 'approved') {
            throw new ConflictError('KYC already approved', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }
        if (status === 'pending' || status === 'under_review') {
            throw new ConflictError('KYC submission already in progress', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }
    }

    // Validate documents
    if (!input.documents || input.documents.length === 0) {
        throw new ValidationError('At least one document is required', ErrorCode.MISSING_FIELD);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Insert submission
        const { rows } = await client.query(
            `
            INSERT INTO kyc_submissions (
                user_id, status, full_name, national_id, date_of_birth,
                address, city, rejection_reason, notes, resubmission_count
            )
            VALUES ($1, 'pending', $2, $3, $4, $5, $6, NULL, NULL, 0)
            RETURNING id, user_id as "userId", status, full_name as "fullName",
                      national_id as "nationalId", date_of_birth as "dateOfBirth",
                      address, city, submitted_at as "submittedAt",
                      reviewed_at as "reviewedAt", reviewed_by as "reviewedBy",
                      rejection_reason as "rejectionReason", notes,
                      resubmission_count as "resubmissionCount"
            `,
            [
                userId,
                input.fullName,
                input.nationalId || null,
                input.dateOfBirth || null,
                input.address || null,
                input.city || null,
            ]
        );

        const submission = rows[0];

        // Insert documents
        for (const doc of input.documents) {
            await client.query(
                `
                INSERT INTO kyc_documents (submission_id, type, url)
                VALUES ($1, $2, $3)
                `,
                [submission.id, doc.type, doc.url]
            );
        }

        await client.query('COMMIT');

        log.info({ submissionId: submission.id, userId }, 'KYC submitted');
        logAudit('kyc_submitted', { userId, resource: submission.id, result: 'success' });

        // Fetch full submission with documents
        return await getKycSubmissionById(String(submission.id));
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        log.error({ error: (error as Error).message, userId }, 'KYC submission failed');
        throw new AppError('Failed to submit KYC', 500, ErrorCode.DATABASE_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Get KYC submission by ID with documents.
 */
export async function getKycSubmissionById(submissionId: string): Promise<KycSubmission> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", status, full_name as "fullName",
               national_id as "nationalId", date_of_birth as "dateOfBirth",
               address, city, submitted_at as "submittedAt",
               reviewed_at as "reviewedAt", reviewed_by as "reviewedBy",
               rejection_reason as "rejectionReason", notes,
               resubmission_count as "resubmissionCount"
        FROM kyc_submissions
        WHERE id = $1
        `,
        [submissionId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('KYC submission not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = rows[0];

    // Fetch documents
    const docRes = await db.query(
        `
        SELECT id, type, url, uploaded_at as "uploadedAt"
        FROM kyc_documents
        WHERE submission_id = $1
        `,
        [submissionId]
    );

    const documents: KycDocument[] = docRes.rows.map((d) => ({
        id: String(d.id),
        type: d.type,
        url: d.url,
        uploadedAt: new Date(d.uploadedAt),
    }));

    return {
        id: String(row.id),
        userId: String(row.userId),
        status: row.status,
        fullName: row.fullName,
        nationalId: row.nationalId,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
        address: row.address,
        city: row.city,
        documents,
        submittedAt: new Date(row.submittedAt),
        reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
        reviewedBy: row.reviewedBy,
        rejectionReason: row.rejectionReason,
        notes: row.notes,
        resubmissionCount: parseInt(row.resubmissionCount) || 0,
    };
}

/**
 * Get KYC status for a user.
 */
export async function getKycStatus(userId: string): Promise<KycStatusResponse> {
    const { rows } = await db.query(
        `
        SELECT status, submitted_at as "submittedAt",
               reviewed_at as "reviewedAt",
               rejection_reason as "rejectionReason",
               resubmission_count as "resubmissionCount"
        FROM kyc_submissions
        WHERE user_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
        `,
        [userId]
    );

    if (rows.length === 0) {
        return {
            status: 'pending',
            submittedAt: null,
            reviewedAt: null,
            rejectionReason: null,
            resubmissionCount: 0,
            isVerified: false,
        };
    }

    const row = rows[0];
    return {
        status: row.status,
        submittedAt: new Date(row.submittedAt),
        reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
        rejectionReason: row.rejectionReason,
        resubmissionCount: parseInt(row.resubmissionCount) || 0,
        isVerified: row.status === 'approved',
    };
}

/**
 * Resubmit KYC after rejection.
 */
export async function resubmitKyc(
    userId: string,
    input: KycSubmissionInput
): Promise<KycSubmission> {
    // Get last submission
    const lastSub = await db.query(
        `
        SELECT id, status, resubmission_count as count
        FROM kyc_submissions
        WHERE user_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
        `,
        [userId]
    );

    if (lastSub.rows.length === 0) {
        throw new NotFoundError('No previous KYC submission found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const lastStatus = lastSub.rows[0].status as KycStatus;
    if (lastStatus !== 'rejected') {
        throw new ValidationError('Can only resubmit after rejection', ErrorCode.INVALID_INPUT);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const newCount = parseInt(lastSub.rows[0].count) + 1;

        // Update existing submission
        const { rows } = await client.query(
            `
            UPDATE kyc_submissions
            SET status = 'resubmitted',
                full_name = $2,
                national_id = $3,
                date_of_birth = $4,
                address = $5,
                city = $6,
                resubmission_count = $7,
                rejection_reason = NULL,
                reviewed_at = NULL,
                reviewed_by = NULL,
                notes = NULL,
                submitted_at = NOW()
            WHERE id = $1
            RETURNING id, user_id as "userId", status, full_name as "fullName",
                      national_id as "nationalId", date_of_birth as "dateOfBirth",
                      address, city, submitted_at as "submittedAt",
                      resubmission_count as "resubmissionCount"
            `,
            [
                lastSub.rows[0].id,
                input.fullName,
                input.nationalId || null,
                input.dateOfBirth || null,
                input.address || null,
                input.city || null,
                newCount,
            ]
        );

        const submission = rows[0];

        // Delete old documents and insert new ones
        await client.query('DELETE FROM kyc_documents WHERE submission_id = $1', [lastSub.rows[0].id]);

        for (const doc of input.documents) {
            await client.query(
                `INSERT INTO kyc_documents (submission_id, type, url) VALUES ($1, $2, $3)`,
                [submission.id, doc.type, doc.url]
            );
        }

        await client.query('COMMIT');

        log.info({ submissionId: submission.id, userId }, 'KYC resubmitted');
        logAudit('kyc_resubmitted', { userId, resource: submission.id, result: 'success' });

        return await getKycSubmissionById(String(submission.id));
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        log.error({ error: (error as Error).message, userId }, 'KYC resubmission failed');
        throw new AppError('Failed to resubmit KYC', 500, ErrorCode.DATABASE_ERROR);
    } finally {
        client.release();
    }
}

// ─── Admin Operations ───────────────────────────────────────────

/**
 * List all KYC submissions (admin).
 */
export async function listKycSubmissions(filters?: {
    status?: KycStatus;
    limit?: number;
    offset?: number;
}): Promise<{ submissions: KycSubmission[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
        whereClause = `WHERE s.status = $${paramIndex++}`;
        params.push(filters.status);
    }

    // Get total count
    const countRes = await db.query(
        `SELECT COUNT(*) as total FROM kyc_submissions s ${whereClause}`,
        params
    );
    const total = parseInt(countRes.rows[0].total) || 0;

    // Get submissions
    let query = `
        SELECT s.id, s.user_id as "userId", s.status, s.full_name as "fullName",
               s.national_id as "nationalId", s.date_of_birth as "dateOfBirth",
               s.address, s.city, s.submitted_at as "submittedAt",
               s.reviewed_at as "reviewedAt", s.reviewed_by as "reviewedBy",
               s.rejection_reason as "rejectionReason", s.notes,
               s.resubmission_count as "resubmissionCount",
               u.full_name as "userName", u.email as "userEmail"
        FROM kyc_submissions s
        JOIN users u ON s.user_id = u.id
        ${whereClause}
        ORDER BY s.submitted_at DESC
    `;

    if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
    }
    if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
    }

    const { rows } = await db.query(query, params);

    // Fetch documents for each submission
    const submissions: KycSubmission[] = [];
    for (const row of rows) {
        const docRes = await db.query(
            `
            SELECT id, type, url, uploaded_at as "uploadedAt"
            FROM kyc_documents
            WHERE submission_id = $1
            `,
            [row.id]
        );

        const documents: KycDocument[] = docRes.rows.map((d) => ({
            id: String(d.id),
            type: d.type,
            url: d.url,
            uploadedAt: new Date(d.uploadedAt),
        }));

        submissions.push({
            id: String(row.id),
            userId: String(row.userId),
            status: row.status,
            fullName: row.fullName,
            nationalId: row.nationalId,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            address: row.address,
            city: row.city,
            documents,
            submittedAt: new Date(row.submittedAt),
            reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
            reviewedBy: row.reviewedBy,
            rejectionReason: row.rejectionReason,
            notes: row.notes,
            resubmissionCount: parseInt(row.resubmissionCount) || 0,
        });
    }

    return { submissions, total };
}

/**
 * Approve a KYC submission.
 */
export async function approveKyc(
    submissionId: string,
    reviewedBy: string,
    notes?: string
): Promise<KycSubmission> {
    const { rows } = await db.query(
        `
        UPDATE kyc_submissions
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = $2,
            rejection_reason = NULL,
            notes = COALESCE($3, notes)
        WHERE id = $1
        RETURNING id
        `,
        [submissionId, reviewedBy, notes || null]
    );

    if (rows.length === 0) {
        throw new NotFoundError('KYC submission not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    log.info({ submissionId, reviewedBy }, 'KYC approved');
    logAudit('kyc_approved', {
        userId: reviewedBy,
        resource: submissionId,
        result: 'success',
    });

    return await getKycSubmissionById(submissionId);
}

/**
 * Reject a KYC submission with reason.
 */
export async function rejectKyc(
    submissionId: string,
    reviewedBy: string,
    rejectionReason: string,
    notes?: string
): Promise<KycSubmission> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new ValidationError('Rejection reason is required', ErrorCode.MISSING_FIELD);
    }

    const { rows } = await db.query(
        `
        UPDATE kyc_submissions
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = $2,
            rejection_reason = $3,
            notes = COALESCE($4, notes)
        WHERE id = $1
        RETURNING id
        `,
        [submissionId, reviewedBy, rejectionReason, notes || null]
    );

    if (rows.length === 0) {
        throw new NotFoundError('KYC submission not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    log.info({ submissionId, reviewedBy, reason: rejectionReason }, 'KYC rejected');
    logAudit('kyc_rejected', {
        userId: reviewedBy,
        resource: submissionId,
        result: 'success',
    });

    return await getKycSubmissionById(submissionId);
}
