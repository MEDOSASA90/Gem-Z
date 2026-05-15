/**
 * GEM Z — Progress Photos Controller
 *
 * Handles photo uploads, timeline views, and AI analysis.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { ProgressService } from './progress.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const progressService = new ProgressService(db);
const log = createLogger('progress-controller');

export class ProgressController {
    /**
     * POST /api/v1/progress/upload
     * Upload a progress photo.
     */
    static async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { imageUrl, photoType, angle, weightAtPhoto, bodyFatAtPhoto, muscleMassAtPhoto, notes, tags } = req.body;

            if (!imageUrl) {
                return res.status(400).json({ success: false, message: 'imageUrl is required' });
            }

            const validTypes = ['front', 'back', 'side', 'custom'];
            if (photoType && !validTypes.includes(photoType)) {
                return res.status(400).json({ success: false, message: 'photoType must be front, back, side, or custom' });
            }

            const photo = await progressService.uploadPhoto(userId, imageUrl, photoType || 'front', {
                angle, weightAtPhoto, bodyFatAtPhoto, muscleMassAtPhoto, notes, tags,
            });

            res.status(201).json(success(photo, 'Photo uploaded successfully'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/progress/timeline
     * Get user's progress photo timeline.
     */
    static async getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const photoType = req.query.photoType as string | undefined;
            const timeline = await progressService.getTimeline(userId, photoType);
            res.status(200).json(success(timeline, 'Timeline retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/progress/photos/:id
     * Get a single photo.
     */
    static async getPhoto(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const photo = await progressService.getPhoto(id, userId);
            res.status(200).json(success(photo, 'Photo retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/progress/photos/:id
     * Delete a photo.
     */
    static async deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await progressService.deletePhoto(id, userId);
            res.status(200).json(success(null, 'Photo deleted'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/progress/photos/:id/analyze
     * Run AI analysis on a photo.
     */
    static async runAIAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const analysis = await progressService.runAIAnalysis(userId, id);
            res.status(200).json(success(analysis, 'AI analysis completed'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/progress/photos/:id/ai-analysis
     * Get AI analysis for a photo.
     */
    static async getAIAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const analysis = await progressService.getAIAnalysisForPhoto(id, userId);
            if (!analysis) {
                return res.status(404).json({ success: false, message: 'No AI analysis found for this photo' });
            }
            res.status(200).json(success(analysis, 'AI analysis retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/progress/compare
     * Compare two photos side-by-side.
     */
    static async comparePhotos(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { photoA, photoB } = req.query;

            if (!photoA || !photoB) {
                return res.status(400).json({ success: false, message: 'photoA and photoB query params are required' });
            }

            const comparison = await progressService.getComparison(userId, photoA as string, photoB as string);
            res.status(200).json(success(comparison, 'Comparison retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
}
