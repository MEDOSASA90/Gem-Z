/**
 * GEM Z — KYC Controller
 *
 * Handles HTTP requests for KYC operations:
 *   - Submit KYC
 *   - Check KYC status
 *   - Resubmit after rejection
 *   - Admin: list all submissions
 *   - Admin: get details
 *   - Admin: approve
 *   - Admin: reject with reason
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';
import * as KycService from './kyc.service';

const log = createLogger('kyc-controller');

export class KycController {
    /**
     * POST /api/v1/user/kyc
     * Submit a new KYC application.
     */
    static async submitKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { fullName, nationalId, dateOfBirth, address, city, documents } = req.body;

            if (!fullName || !documents || documents.length === 0) {
                throw new ValidationError(
                    'Full name and at least one document are required',
                    ErrorCode.MISSING_FIELD
                );
            }

            const submission = await KycService.submitKyc(userId, {
                fullName,
                nationalId,
                dateOfBirth,
                address,
                city,
                documents,
            });

            res.status(201).json({
                success: true,
                message: 'KYC submitted successfully',
                submission,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/user/kyc/status
     * Check current user's KYC status.
     */
    static async getKycStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const status = await KycService.getKycStatus(userId);

            res.status(200).json({
                success: true,
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/kyc/resubmit
     * Resubmit KYC after rejection.
     */
    static async resubmitKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { fullName, nationalId, dateOfBirth, address, city, documents } = req.body;

            if (!fullName || !documents || documents.length === 0) {
                throw new ValidationError(
                    'Full name and at least one document are required',
                    ErrorCode.MISSING_FIELD
                );
            }

            const submission = await KycService.resubmitKyc(userId, {
                fullName,
                nationalId,
                dateOfBirth,
                address,
                city,
                documents,
            });

            res.status(200).json({
                success: true,
                message: 'KYC resubmitted successfully',
                submission,
            });
        } catch (error) {
            next(error);
        }
    }

    // ─── Admin Endpoints ──────────────────────────────────────────

    /**
     * GET /api/v1/admin/kyc
     * List all KYC submissions (admin only).
     */
    static async listSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // Ensure admin role
            if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
                throw new ForbiddenError('Admin access required', ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
            }

            const { status, limit, offset } = req.query;

            const result = await KycService.listKycSubmissions({
                status: status as KycService.KycStatus | undefined,
                limit: limit ? parseInt(limit as string) : 50,
                offset: offset ? parseInt(offset as string) : 0,
            });

            res.status(200).json({
                success: true,
                data: result.submissions,
                pagination: {
                    total: result.total,
                    limit: limit ? parseInt(limit as string) : 50,
                    offset: offset ? parseInt(offset as string) : 0,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/admin/kyc/:id
     * Get a single KYC submission detail (admin only).
     */
    static async getSubmission(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
                throw new ForbiddenError('Admin access required', ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
            }

            const { id } = req.params;
            const submission = await KycService.getKycSubmissionById(id);

            res.status(200).json({
                success: true,
                submission,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/admin/kyc/:id/approve
     * Approve a KYC submission (admin only).
     */
    static async approveKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
                throw new ForbiddenError('Admin access required', ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
            }

            const { id } = req.params;
            const { notes } = req.body;
            const reviewedBy = req.user?.userId;

            const submission = await KycService.approveKyc(id, reviewedBy, notes);

            res.status(200).json({
                success: true,
                message: 'KYC approved successfully',
                submission,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/admin/kyc/:id/reject
     * Reject a KYC submission with reason (admin only).
     */
    static async rejectKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
                throw new ForbiddenError('Admin access required', ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
            }

            const { id } = req.params;
            const { reason, notes } = req.body;
            const reviewedBy = req.user?.userId;

            if (!reason || reason.trim().length === 0) {
                throw new ValidationError('Rejection reason is required', ErrorCode.MISSING_FIELD);
            }

            const submission = await KycService.rejectKyc(id, reviewedBy, reason, notes);

            res.status(200).json({
                success: true,
                message: 'KYC rejected',
                submission,
            });
        } catch (error) {
            next(error);
        }
    }
}
