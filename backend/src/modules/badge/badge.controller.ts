/**
 * GEM Z — Badges System Controller
 *
 * Handles badge listing, progress checking, and awarding.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { BadgeService } from './badge.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const badgeService = new BadgeService(db);
const log = createLogger('badge-controller');

export class BadgeController {
    /**
     * GET /api/v1/badges
     * List all badges with user's progress.
     */
    static async listBadges(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const badges = await badgeService.listBadges(userId);
            res.status(200).json(success(badges, 'Badges retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/badges/check
     * Check and award any newly earned badges.
     */
    static async checkAndAward(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const result = await badgeService.checkAndAwardBadges(userId);
            res.status(200).json(success(result, 'Badges checked and awarded'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/badges/stats
     * Get badge statistics for the user.
     */
    static async getBadgeStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const stats = await badgeService.getBadgeStats(userId);
            res.status(200).json(success(stats, 'Badge stats retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/badges/seed
     * Seed default badges (admin only).
     */
    static async seedBadges(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await badgeService.seedBadges();
            res.status(200).json(success(null, 'Badges seeded'));
        } catch (error) {
            next(error);
        }
    }
}
