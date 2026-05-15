/**
 * GEM Z — Community Challenges Controller
 *
 * Handles community challenge CRUD, joining, and progress tracking.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { CommunityService } from './community.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const communityService = new CommunityService(db);
const log = createLogger('community-controller');

export class CommunityController {
    /**
     * POST /api/v1/community/challenges
     * Create a new community challenge.
     */
    static async createChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { title, description, challengeType, targetValue, unit, startDate, endDate, isPublic, maxParticipants, reward } = req.body;

            log.info({ userId, title, challengeType }, 'Creating community challenge');

            const challenge = await communityService.createChallenge(userId, {
                title,
                description,
                challengeType,
                targetValue,
                unit,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isPublic,
                maxParticipants,
                reward,
            });

            res.status(201).json(success(challenge, 'Challenge created'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/community/challenges
     * List community challenges.
     */
    static async listChallenges(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { status, type, mine } = req.query;

            const challenges = await communityService.listChallenges(userId, {
                status: status as string | undefined,
                type: type as string | undefined,
                mine: mine === 'true',
            });

            res.status(200).json(success(challenges, 'Challenges retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/community/challenges/:id
     * Get challenge details with leaderboard.
     */
    static async getChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const result = await communityService.getChallenge(id, userId);
            res.status(200).json(success(result, 'Challenge retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/community/challenges/:id/join
     * Join a challenge.
     */
    static async joinChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await communityService.joinChallenge(id, userId);
            res.status(200).json(success(null, 'Joined challenge'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/community/challenges/:id/leave
     * Leave a challenge.
     */
    static async leaveChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await communityService.leaveChallenge(id, userId);
            res.status(200).json(success(null, 'Left challenge'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/community/challenges/:id/progress
     * Update challenge progress.
     */
    static async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { progress } = req.body;

            const result = await communityService.updateProgress(id, userId, progress);
            res.status(200).json(success(result, 'Progress updated'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/community/challenges/:id
     * Delete a challenge.
     */
    static async deleteChallenge(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await communityService.deleteChallenge(id, userId);
            res.status(200).json(success(null, 'Challenge deleted'));
        } catch (error) {
            next(error);
        }
    }
}
