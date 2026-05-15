/**
 * GEM Z — Water Tracking Controller
 *
 * Handles water intake logging, goals, and reminders.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { WaterService } from './water.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const waterService = new WaterService(db);
const log = createLogger('water-controller');

export class WaterController {
    /**
     * POST /api/v1/water/log
     * Log water intake.
     */
    static async logWater(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { amountMl, source, notes } = req.body;

            log.info({ userId, amountMl }, 'Logging water intake');

            const logEntry = await waterService.logWater(userId, { amountMl, source, notes });
            res.status(201).json(success(logEntry, 'Water intake logged'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/today
     * Get today's water logs and summary.
     */
    static async getToday(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const today = await waterService.getTodayLogs(userId);
            res.status(200).json(success(today, 'Today water data retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/history
     * Get water history for a date.
     */
    static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { date } = req.query;
            const targetDate = date ? new Date(date as string) : new Date();
            const logs = await waterService.getLogsForDate(userId, targetDate);
            const summary = await waterService.getDailySummary(userId, targetDate);
            res.status(200).json(success({ logs, summary }, 'Water history retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/weekly
     * Get weekly water summary.
     */
    static async getWeekly(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const weekly = await waterService.getWeeklySummary(userId);
            res.status(200).json(success(weekly, 'Weekly water summary retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/water/logs/:id
     * Delete a water log.
     */
    static async deleteLog(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await waterService.deleteWaterLog(id, userId);
            res.status(200).json(success(null, 'Water log deleted'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/goal
     * Get user's water goal.
     */
    static async getGoal(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const goalMl = await waterService.getUserGoal(userId);
            res.status(200).json(success({ goalMl }, 'Water goal retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/water/goal
     * Set user's water goal.
     */
    static async setGoal(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { goalMl } = req.body;
            await waterService.setUserGoal(userId, goalMl);
            res.status(200).json(success(null, 'Water goal updated'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/stats
     * Get water statistics.
     */
    static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const stats = await waterService.getWaterStats(userId);
            res.status(200).json(success(stats, 'Water stats retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/water/reminder
     * Get reminder settings.
     */
    static async getReminder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const reminder = await waterService.getReminder(userId);
            res.status(200).json(success(reminder, 'Reminder settings retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/water/reminder
     * Set reminder settings.
     */
    static async setReminder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { enabled, intervalMinutes, startTime, endTime } = req.body;

            const reminder = await waterService.setReminder(userId, {
                enabled,
                intervalMinutes,
                startTime,
                endTime,
            });

            res.status(200).json(success(reminder, 'Reminder settings updated'));
        } catch (error) {
            next(error);
        }
    }
}
