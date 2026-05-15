/**
 * GEM Z — Sleep Tracking Controller
 *
 * Handles sleep logging, trends, and statistics.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { SleepService } from './sleep.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const sleepService = new SleepService(db);
const log = createLogger('sleep-controller');

export class SleepController {
    /**
     * POST /api/v1/sleep/log
     * Log a sleep entry.
     */
    static async logSleep(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { bedTime, wakeTime, quality, deepSleepMinutes, lightSleepMinutes, remSleepMinutes, awakeMinutes, factors, notes } = req.body;

            log.info({ userId, bedTime, wakeTime }, 'Logging sleep');

            const logEntry = await sleepService.logSleep(userId, {
                bedTime: new Date(bedTime),
                wakeTime: new Date(wakeTime),
                quality,
                deepSleepMinutes,
                lightSleepMinutes,
                remSleepMinutes,
                awakeMinutes,
                factors,
                notes,
            });

            res.status(201).json(success(logEntry, 'Sleep logged'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sleep/logs
     * List sleep logs with optional date range.
     */
    static async listSleepLogs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { startDate, endDate, limit, offset } = req.query;

            const result = await sleepService.listSleepLogs(userId, {
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: limit ? parseInt(limit as string, 10) : undefined,
                offset: offset ? parseInt(offset as string, 10) : undefined,
            });

            res.status(200).json(success(result, 'Sleep logs retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sleep/logs/:id
     * Get a single sleep log.
     */
    static async getSleepLog(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const logEntry = await sleepService.getSleepLog(id, userId);
            res.status(200).json(success(logEntry, 'Sleep log retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/sleep/logs/:id
     * Update a sleep log.
     */
    static async updateSleepLog(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { bedTime, wakeTime, quality, deepSleepMinutes, lightSleepMinutes, remSleepMinutes, awakeMinutes, factors, notes } = req.body;

            const logEntry = await sleepService.updateSleepLog(id, userId, {
                bedTime: bedTime ? new Date(bedTime) : undefined,
                wakeTime: wakeTime ? new Date(wakeTime) : undefined,
                quality,
                deepSleepMinutes,
                lightSleepMinutes,
                remSleepMinutes,
                awakeMinutes,
                factors,
                notes,
            });

            res.status(200).json(success(logEntry, 'Sleep log updated'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/sleep/logs/:id
     * Delete a sleep log.
     */
    static async deleteSleepLog(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await sleepService.deleteSleepLog(id, userId);
            res.status(200).json(success(null, 'Sleep log deleted'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sleep/stats
     * Get sleep statistics.
     */
    static async getSleepStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { days } = req.query;
            const daysNum = days ? parseInt(days as string, 10) : 30;

            const stats = await sleepService.getSleepStats(userId, daysNum);
            res.status(200).json(success(stats, 'Sleep stats retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/sleep/trends
     * Get sleep trend data.
     */
    static async getSleepTrends(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { days } = req.query;
            const daysNum = days ? parseInt(days as string, 10) : 14;

            const trends = await sleepService.getSleepTrends(userId, daysNum);
            res.status(200).json(success(trends, 'Sleep trends retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
