/**
 * GEM Z — Analytics Routes (Admin Only)
 *
 * All routes require admin or superadmin role.
 *
 * Routes:
 *   GET    /api/v1/analytics/dashboard        — Full dashboard data bundle
 *   GET    /api/v1/analytics/kpis             — KPI summary
 *   GET    /api/v1/analytics/users/growth     — User growth time series
 *   GET    /api/v1/analytics/workouts/trend   — Workout trend time series
 *   GET    /api/v1/analytics/revenue/trend    — Revenue trend time series
 *   GET    /api/v1/analytics/revenue/breakdown — Revenue breakdown by category
 *   GET    /api/v1/analytics/engagement       — Engagement metrics
 *   GET    /api/v1/analytics/gyms/top         — Top performing gyms
 *   GET    /api/v1/analytics/users/segments   — User segmentation
 */

import express, { Response, NextFunction } from 'express';
import { query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { AnalyticsController, requireAdmin } from './analytics.controller';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const router = express.Router();
const log = createLogger('analytics-routes');

const auth = authenticate as any;

// ─── Validation Helpers ─────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            const fields: Record<string, string> = {};
            errors.array().forEach((err: any) => {
                fields[err.path || err.param] = err.msg;
            });
            return next(new ValidationError('Validation failed', ErrorCode.VALIDATION_ERROR, fields));
        }
        next();
    };
};

// ─── Apply Admin Middleware to All Routes ───────────────────────

router.use(auth, requireAdmin);

// ─── Dashboard ──────────────────────────────────────────────────

router.get(
    '/dashboard',
    validate([
        query('range').optional().isIn(['7d', '30d', '90d', '1y']),
    ]),
    AnalyticsController.getDashboardData
);

// ─── KPIs ───────────────────────────────────────────────────────

router.get('/kpis', AnalyticsController.getKpiSummary);

// ─── Time Series ────────────────────────────────────────────────

router.get(
    '/users/growth',
    validate([query('range').optional().isIn(['7d', '30d', '90d', '1y'])]),
    AnalyticsController.getUserGrowth
);

router.get(
    '/workouts/trend',
    validate([query('range').optional().isIn(['7d', '30d', '90d', '1y'])]),
    AnalyticsController.getWorkoutTrend
);

router.get(
    '/revenue/trend',
    validate([query('range').optional().isIn(['7d', '30d', '90d', '1y'])]),
    AnalyticsController.getRevenueTrend
);

// ─── Breakdown & Segments ───────────────────────────────────────

router.get('/revenue/breakdown', AnalyticsController.getRevenueBreakdown);

router.get('/engagement', AnalyticsController.getEngagementMetrics);

router.get(
    '/gyms/top',
    validate([query('limit').optional().isInt({ min: 1, max: 50 })]),
    AnalyticsController.getTopGyms
);

router.get('/users/segments', AnalyticsController.getUserSegments);

export default router;
