/**
 * GEM Z — Affiliate Program Controller
 *
 * Handles affiliate registration, dashboard stats, and payouts.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { AffiliateService } from './affiliate.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const affiliateService = new AffiliateService(db);
const log = createLogger('affiliate-controller');

export class AffiliateController {
    /**
     * POST /api/v1/affiliate/join
     * Become an affiliate.
     */
    static async join(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const affiliate = await affiliateService.joinAffiliate(userId);
            res.status(201).json(success(affiliate, 'Welcome to the affiliate program!'));
        } catch (error: any) {
            if (error.name === 'ConflictError') {
                return res.status(409).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/affiliate/me
     * Get current user's affiliate info.
     */
    static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const affiliate = await affiliateService.getAffiliate(userId);
            if (!affiliate) {
                return res.status(404).json({ success: false, message: 'Not an affiliate yet', isAffiliate: false });
            }
            res.status(200).json(success(affiliate, 'Affiliate info retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/affiliate/dashboard
     * Get affiliate dashboard data.
     */
    static async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const dashboard = await affiliateService.getDashboard(userId);
            res.status(200).json(success(dashboard, 'Dashboard retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message, isAffiliate: false });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/affiliate/payouts
     * Get payout history.
     */
    static async getPayouts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const payouts = await affiliateService.getPayouts(userId);
            res.status(200).json(success(payouts, 'Payouts retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/affiliate/payouts
     * Request a payout.
     */
    static async requestPayout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { amount, method, details } = req.body;

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid payout amount' });
            }

            if (!method || !['bank_transfer', 'instapay'].includes(method)) {
                return res.status(400).json({ success: false, message: 'Invalid payout method. Use bank_transfer or instapay' });
            }

            if (!details || typeof details !== 'object') {
                return res.status(400).json({ success: false, message: 'Payout details are required' });
            }

            const payout = await affiliateService.requestPayout(userId, Number(amount), method, details);
            res.status(201).json(success(payout, 'Payout request submitted'));
        } catch (error: any) {
            if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * PUT /api/v1/affiliate/payout-settings
     * Update payout settings.
     */
    static async updatePayoutSettings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { method, details } = req.body;

            if (!method || !['bank_transfer', 'instapay'].includes(method)) {
                return res.status(400).json({ success: false, message: 'Invalid payout method' });
            }

            if (!details || typeof details !== 'object') {
                return res.status(400).json({ success: false, message: 'Payout details are required' });
            }

            const affiliate = await affiliateService.updatePayoutSettings(userId, method, details);
            res.status(200).json(success(affiliate, 'Payout settings updated'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/affiliate/track-click
     * Track a referral link click (public endpoint).
     */
    static async trackClick(req: any, res: Response, next: NextFunction) {
        try {
            const { code } = req.params;
            const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const referrer = req.headers.referer || null;

            const recorded = await affiliateService.recordClick(code, ipAddress, userAgent, referrer);
            if (recorded) {
                res.status(200).json({ success: true, message: 'Click tracked' });
            } else {
                res.status(404).json({ success: false, message: 'Invalid referral code' });
            }
        } catch (error) {
            next(error);
        }
    }
}
