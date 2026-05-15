/**
 * GEM Z — Referral Controller
 *
 * Handles HTTP requests for referral operations:
 * - Get referral link and code
 * - View referral statistics
 * - Process referrals on signup
 * - Referral leaderboard
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { ReferralService } from './referral.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ErrorCode,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const referralService = new ReferralService(db);
const log = createLogger('referral-controller');

export class ReferralController {
    // ─── Referral Code ────────────────────────────────────────

    static async getReferralCode(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const code = await referralService.getOrCreateReferralCode(userId);
            res.status(200).json(success(code, 'Referral code retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Referral Stats ───────────────────────────────────────

    static async getReferralStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const stats = await referralService.getReferralStats(userId);
            res.status(200).json(success(stats, 'Referral stats retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getReferredUsers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const users = await referralService.getReferredUsers(userId);
            res.status(200).json(success(users, 'Referred users retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Referral Processing ──────────────────────────────────

    static async processReferral(req: Request, res: Response, next: NextFunction) {
        try {
            const { referredId, code } = req.body;

            if (!referredId || !code) {
                return next(
                    new ValidationError(
                        'referredId and code are required',
                        ErrorCode.MISSING_FIELD
                    )
                );
            }

            await referralService.processReferral(referredId, code);
            res.status(200).json(success(null, 'Referral processed successfully'));
        } catch (error) {
            next(error);
        }
    }

    static async completeReferral(req: Request, res: Response, next: NextFunction) {
        try {
            const { referredId } = req.body;

            if (!referredId) {
                return next(
                    new ValidationError('referredId is required', ErrorCode.MISSING_FIELD)
                );
            }

            await referralService.completeReferral(referredId);
            res.status(200).json(success(null, 'Referral marked as completed'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Leaderboard ──────────────────────────────────────────

    static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
            const leaderboard = await referralService.getLeaderboard(limit);
            res.status(200).json(success(leaderboard, 'Referral leaderboard retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
