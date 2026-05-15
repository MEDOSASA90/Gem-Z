/**
 * GEM Z — Gym Pass Controller
 *
 * Handles HTTP requests for multi-gym pass operations:
 * - Plan management (CRUD)
 * - Pass purchase and management
 * - Pass validation for gym entry
 * - Gym network discovery
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { GymPassService, CreatePlanInput, PassTier } from './gympass.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ErrorCode,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const gymPassService = new GymPassService(db);
const log = createLogger('gympass-controller');

export class GymPassController {
    // ─── Plan Management ──────────────────────────────────────

    static async createPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data: CreatePlanInput = {
                name: req.body.name,
                description: req.body.description,
                tier: req.body.tier,
                price: req.body.price,
                priceUnit: req.body.priceUnit,
                durationDays: req.body.durationDays,
                maxGyms: req.body.maxGyms,
                maxVisitsPerMonth: req.body.maxVisitsPerMonth,
                perks: req.body.perks,
            };

            const plan = await gymPassService.createPlan(data);
            res.status(201).json(success(plan, 'Gym pass plan created'));
        } catch (error) {
            next(error);
        }
    }

    static async listPlans(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tier = req.query.tier as PassTier | undefined;
            const plans = await gymPassService.listPlans(tier);
            res.status(200).json(success(plans, 'Gym pass plans retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Pass Management ──────────────────────────────────────

    static async purchasePass(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { planId, autoRenew } = req.body;

            if (!planId) {
                return next(
                    new ValidationError('planId is required', ErrorCode.MISSING_FIELD)
                );
            }

            const pass = await gymPassService.purchasePass(userId, planId, autoRenew ?? false);
            res.status(201).json(success(pass, 'Gym pass purchased successfully'));
        } catch (error) {
            next(error);
        }
    }

    static async getUserPasses(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const passes = await gymPassService.getUserPasses(userId);
            res.status(200).json(success(passes, 'User passes retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async cancelAutoRenew(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            await gymPassService.cancelAutoRenew(id, userId);
            res.status(200).json(success(null, 'Auto-renew cancelled'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Validation & Redemption ──────────────────────────────

    static async validatePass(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { gymId } = req.params;

            const result = await gymPassService.validatePass(userId, gymId);
            res.status(200).json(success(result, 'Pass validated'));
        } catch (error) {
            next(error);
        }
    }

    static async redeemVisit(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id: passId } = req.params;
            const { gymId } = req.body;

            if (!gymId) {
                return next(
                    new ValidationError('gymId is required', ErrorCode.MISSING_FIELD)
                );
            }

            const result = await gymPassService.redeemVisit(passId, userId, gymId);
            res.status(200).json(success(result, 'Visit redeemed'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Gym Network ──────────────────────────────────────────

    static async getGymNetwork(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const city = req.query.city as string | undefined;
            const tier = req.query.tier as PassTier | undefined;

            const gyms = await gymPassService.getGymNetwork(city, tier);
            res.status(200).json(success(gyms, 'Gym network retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getPassHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { passId } = req.query;

            const history = await gymPassService.getPassHistory(
                userId,
                passId as string | undefined
            );
            res.status(200).json(success(history, 'Pass history retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
