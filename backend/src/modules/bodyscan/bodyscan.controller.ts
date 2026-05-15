/**
 * GEM Z — Body Scan 3D Controller
 *
 * Handles HTTP requests for body scan analysis:
 *   - POST /api/v1/bodyscan/upload  — Upload body photos (front/side/back)
 *   - GET  /api/v1/bodyscan/history — List scan history
 *   - GET  /api/v1/bodyscan/progress — Compare measurements over time
 *   - GET  /api/v1/bodyscan/:id     — Get single scan details
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';
import * as BodyScanService from './bodyscan.service';

const log = createLogger('bodyscan-controller');

export class BodyScanController {
    /**
     * POST /api/v1/bodyscan/upload
     * Upload body photos and analyze body composition.
     */
    static async uploadPhotos(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { frontPhotoUrl, sidePhotoUrl, backPhotoUrl } = req.body;

            if (!frontPhotoUrl) {
                throw new ValidationError('frontPhotoUrl is required', ErrorCode.MISSING_FIELD);
            }

            const result = await BodyScanService.uploadAndAnalyze(userId, {
                frontPhotoUrl,
                sidePhotoUrl,
                backPhotoUrl,
            });

            res.status(201).json({
                success: true,
                message: 'Body scan analysis complete',
                scan: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/bodyscan/history
     * List body scan history for the authenticated user.
     */
    static async listHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { scans, total } = await BodyScanService.listScans(userId, limit, offset);

            res.status(200).json({
                success: true,
                data: scans,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/bodyscan/progress
     * Get body measurement progress over time.
     */
    static async getProgress(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const progress = await BodyScanService.getProgress(userId);

            res.status(200).json({
                success: true,
                data: progress,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/bodyscan/:id
     * Get a single body scan by ID.
     */
    static async getScan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const scan = await BodyScanService.getScanById(id);

            if (scan.userId !== userId) {
                throw new ValidationError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
            }

            res.status(200).json({
                success: true,
                data: scan,
            });
        } catch (error) {
            next(error);
        }
    }
}
