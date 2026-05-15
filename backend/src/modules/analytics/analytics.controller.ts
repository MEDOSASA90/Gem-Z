/**
 * GEM Z — Analytics Controller (Admin Only)
 *
 * Handles HTTP requests for analytics operations:
 * - KPI summary
 * - Chart data (user growth, workout trends, revenue)
 * - Engagement metrics
 * - Revenue breakdown
 * - Full dashboard data bundle
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { AnalyticsService, DateRange } from './analytics.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const analyticsService = new AnalyticsService(db);
const log = createLogger('analytics-controller');

/**
 * Middleware to ensure only admins can access analytics endpoints.
 */
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
        return next(
            new ForbiddenError(
                'Admin access required',
                ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE
            )
        );
    }
    next();
}

export { requireAdmin };

export class AnalyticsController {
    // ─── KPIs ─────────────────────────────────────────────────

    static async getKpiSummary(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const kpis = await analyticsService.getKpiSummary();
            res.status(200).json(success(kpis, 'KPI summary retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Time Series ──────────────────────────────────────────

    static async getUserGrowth(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const range = (req.query.range as DateRange) || '30d';
            if (!['7d', '30d', '90d', '1y'].includes(range)) {
                return next(
                    new ValidationError(
                        'Invalid range. Use: 7d, 30d, 90d, 1y',
                        ErrorCode.INVALID_INPUT
                    )
                );
            }
            const data = await analyticsService.getUserGrowth(range);
            res.status(200).json(success(data, 'User growth data retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getWorkoutTrend(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const range = (req.query.range as DateRange) || '30d';
            if (!['7d', '30d', '90d', '1y'].includes(range)) {
                return next(
                    new ValidationError(
                        'Invalid range. Use: 7d, 30d, 90d, 1y',
                        ErrorCode.INVALID_INPUT
                    )
                );
            }
            const data = await analyticsService.getWorkoutTrend(range);
            res.status(200).json(success(data, 'Workout trend data retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getRevenueTrend(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const range = (req.query.range as DateRange) || '30d';
            if (!['7d', '30d', '90d', '1y'].includes(range)) {
                return next(
                    new ValidationError(
                        'Invalid range. Use: 7d, 30d, 90d, 1y',
                        ErrorCode.INVALID_INPUT
                    )
                );
            }
            const data = await analyticsService.getRevenueTrend(range);
            res.status(200).json(success(data, 'Revenue trend data retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Breakdown & Segments ─────────────────────────────────

    static async getRevenueBreakdown(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await analyticsService.getRevenueBreakdown();
            res.status(200).json(success(data, 'Revenue breakdown retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getEngagementMetrics(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await analyticsService.getEngagementMetrics();
            res.status(200).json(success(data, 'Engagement metrics retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getTopGyms(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
            const data = await analyticsService.getTopGyms(limit);
            res.status(200).json(success(data, 'Top gyms retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getUserSegments(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await analyticsService.getUserSegments();
            res.status(200).json(success(data, 'User segments retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Full Dashboard ───────────────────────────────────────

    static async getDashboardData(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const range = (req.query.range as DateRange) || '30d';
            if (!['7d', '30d', '90d', '1y'].includes(range)) {
                return next(
                    new ValidationError(
                        'Invalid range. Use: 7d, 30d, 90d, 1y',
                        ErrorCode.INVALID_INPUT
                    )
                );
            }
            const data = await analyticsService.getDashboardData(range);
            res.status(200).json(success(data, 'Dashboard data retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
