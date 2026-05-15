/**
 * GEM Z — Gift Cards + Subscription Gifting Controller
 *
 * Handles HTTP requests for digital gift card management:
 *   - POST /api/v1/gift/create            — Create gift card
 *   - GET  /api/v1/gift/validate/:code    — Validate gift card by code
 *   - POST /api/v1/gift/redeem            — Redeem gift card
 *   - GET  /api/v1/gift/sent              — List sent gift cards
 *   - GET  /api/v1/gift/received          — List received gift cards
 *   - POST /api/v1/gift/:id/cancel        — Cancel gift card
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';
import * as GiftService from './gift.service';

const log = createLogger('gift-controller');

export class GiftController {
    /**
     * POST /api/v1/gift/create
     * Create a new gift card.
     */
    static async createGift(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const senderId = req.user?.userId;
            if (!senderId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { recipientEmail, recipientName, recipientPhone, message, giftType, amount, currency, subscriptionPlanId, subscriptionMonths, designTheme, expiryDays } = req.body;

            if (!recipientEmail) {
                throw new ValidationError('recipientEmail is required', ErrorCode.MISSING_FIELD);
            }

            const gift = await GiftService.createGiftCard(senderId, {
                recipientEmail,
                recipientName,
                recipientPhone,
                message,
                giftType,
                amount,
                currency,
                subscriptionPlanId,
                subscriptionMonths,
                designTheme,
                expiryDays,
            });

            res.status(201).json({
                success: true,
                message: 'Gift card created successfully',
                giftCard: {
                    id: gift.id,
                    code: gift.code,
                    recipientEmail: gift.recipientEmail,
                    amount: gift.amount,
                    currency: gift.currency,
                    giftType: gift.giftType,
                    status: gift.status,
                    expiryDate: gift.expiryDate,
                    qrCodeUrl: gift.qrCodeUrl,
                    designTheme: gift.designTheme,
                    createdAt: gift.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/gift/validate/:code
     * Validate a gift card by its code.
     */
    static async validateGift(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { code } = req.params;
            const recipientEmail = req.query.email as string | undefined;

            if (!code) {
                throw new ValidationError('Gift card code is required', ErrorCode.MISSING_FIELD);
            }

            const result = await GiftService.validateGiftCard(code, recipientEmail);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/gift/redeem
     * Redeem a gift card.
     */
    static async redeemGift(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const redeemedBy = req.user?.userId;
            if (!redeemedBy) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { code, email } = req.body;
            if (!code) {
                throw new ValidationError('code is required', ErrorCode.MISSING_FIELD);
            }

            const result = await GiftService.redeemGiftCard(
                code,
                redeemedBy,
                email,
                req.ip,
                req.headers['user-agent']
            );

            res.status(200).json({
                success: result.success,
                message: result.message,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/gift/sent
     * List gift cards sent by the authenticated user.
     */
    static async listSent(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const senderId = req.user?.userId;
            if (!senderId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { gifts, total } = await GiftService.listSentGifts(senderId, limit, offset);

            res.status(200).json({
                success: true,
                data: gifts,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/gift/received
     * List gift cards received (redeemed) by the authenticated user.
     */
    static async listReceived(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { gifts, total } = await GiftService.listReceivedGifts(userId, limit, offset);

            res.status(200).json({
                success: true,
                data: gifts,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/gift/:id/cancel
     * Cancel a gift card (only by sender).
     */
    static async cancelGift(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const senderId = req.user?.userId;
            if (!senderId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;

            await GiftService.cancelGiftCard(id, senderId);

            res.status(200).json({
                success: true,
                message: 'Gift card cancelled successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
