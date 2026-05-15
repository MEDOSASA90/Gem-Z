/**
 * GEM Z — Loyalty Program Controller
 *
 * Handles points display, tier progression, rewards catalog, and redemption.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { LoyaltyService } from './loyalty.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const loyaltyService = new LoyaltyService(db);
const log = createLogger('loyalty-controller');

export class LoyaltyController {
    /**
     * GET /api/v1/loyalty/points
     * Get user's current points and tier.
     */
    static async getPoints(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const points = await loyaltyService.getPoints(userId);
            res.status(200).json(success(points, 'Points retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/loyalty/tiers
     * Get all loyalty tiers.
     */
    static async getTiers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tiers = await loyaltyService.getTiers();
            res.status(200).json(success(tiers, 'Tiers retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/loyalty/tier-status
     * Get user's tier with progress.
     */
    static async getTierStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const tierStatus = await loyaltyService.getUserTier(userId);
            res.status(200).json(success(tierStatus, 'Tier status retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/loyalty/rewards
     * List redeemable rewards.
     */
    static async getRewards(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const category = req.query.category as string | undefined;
            const rewards = await loyaltyService.getRewards(category);
            res.status(200).json(success(rewards, 'Rewards retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/loyalty/redeem
     * Redeem a reward.
     */
    static async redeemReward(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { rewardId } = req.body;

            if (!rewardId) {
                return res.status(400).json({ success: false, message: 'rewardId is required' });
            }

            const result = await loyaltyService.redeemReward(userId, rewardId);
            res.status(200).json(success(result, result.message));
        } catch (error: any) {
            if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/loyalty/redemptions
     * Get user's redemption history.
     */
    static async getRedemptionHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const history = await loyaltyService.getRedemptionHistory(userId);
            res.status(200).json(success(history, 'Redemption history retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/loyalty/award
     * Award points to user (internal/webhook use).
     */
    static async awardPoints(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { points, type, description, referenceId } = req.body;

            if (!points || isNaN(points) || Number(points) <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid points amount' });
            }

            if (!type || !['checkin', 'purchase', 'referral', 'challenge', 'bonus'].includes(type)) {
                return res.status(400).json({ success: false, message: 'Invalid or missing type' });
            }

            const transaction = await loyaltyService.awardPoints(
                userId, Number(points), type, description || `${type} reward`, referenceId
            );
            res.status(200).json(success(transaction, `${points} points awarded for ${type}`));
        } catch (error) {
            next(error);
        }
    }
}
