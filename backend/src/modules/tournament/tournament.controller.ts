/**
 * GEM Z — Tournament Controller
 *
 * Handles HTTP requests for tournament operations:
 * - CRUD tournaments
 * - Join/leave tournaments
 * - Score updates and leaderboard retrieval
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { TournamentService, CreateTournamentInput, TournamentStatus, TournamentType } from './tournament.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ErrorCode,
    buildErrorResponse,
} from '../../core/errors';
import { success, paginated, buildPaginationMeta } from '../../core/utils/api-response';

const tournamentService = new TournamentService(db);
const log = createLogger('tournament-controller');

export class TournamentController {
    // ─── Tournament CRUD ──────────────────────────────────────

    static async createTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const data: CreateTournamentInput = {
                name: req.body.name,
                description: req.body.description,
                type: req.body.type,
                prizePool: req.body.prizePool,
                prizePoolUnit: req.body.prizePoolUnit,
                entryFee: req.body.entryFee,
                entryFeeUnit: req.body.entryFeeUnit,
                maxParticipants: req.body.maxParticipants,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                rules: req.body.rules,
                imageUrl: req.body.imageUrl,
                gymId: req.body.gymId,
            };

            const tournament = await tournamentService.createTournament(userId, data);
            res.status(201).json(success(tournament, 'Tournament created successfully'));
        } catch (error) {
            next(error);
        }
    }

    static async listTournaments(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const filters: {
                status?: TournamentStatus;
                type?: TournamentType;
                gymId?: string;
                page?: number;
                limit?: number;
            } = {};

            if (req.query.status) {
                filters.status = req.query.status as TournamentStatus;
            }
            if (req.query.type) {
                filters.type = req.query.type as TournamentType;
            }
            if (req.query.gymId) {
                filters.gymId = req.query.gymId as string;
            }
            filters.page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
            filters.limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

            const result = await tournamentService.listTournaments(filters);

            res.status(200).json(
                paginated(
                    result.tournaments,
                    buildPaginationMeta(
                        result.total,
                        filters.page,
                        filters.limit
                    ),
                    'Tournaments retrieved'
                )
            );
        } catch (error) {
            next(error);
        }
    }

    static async getTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tournament = await tournamentService.getTournament(id);
            res.status(200).json(success(tournament, 'Tournament retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async updateTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const data: Partial<CreateTournamentInput> = {
                name: req.body.name,
                description: req.body.description,
                prizePool: req.body.prizePool,
                prizePoolUnit: req.body.prizePoolUnit,
                entryFee: req.body.entryFee,
                entryFeeUnit: req.body.entryFeeUnit,
                maxParticipants: req.body.maxParticipants,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                rules: req.body.rules,
                imageUrl: req.body.imageUrl,
            };

            const tournament = await tournamentService.updateTournament(id, userId, data);
            res.status(200).json(success(tournament, 'Tournament updated'));
        } catch (error) {
            next(error);
        }
    }

    static async deleteTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            await tournamentService.deleteTournament(id, userId);
            res.status(200).json(success(null, 'Tournament deleted'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Participant Management ───────────────────────────────

    static async joinTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            await tournamentService.joinTournament(id, userId);
            res.status(200).json(success(null, 'Joined tournament successfully'));
        } catch (error) {
            next(error);
        }
    }

    static async leaveTournament(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            await tournamentService.leaveTournament(id, userId);
            res.status(200).json(success(null, 'Left tournament successfully'));
        } catch (error) {
            next(error);
        }
    }

    // ─── Scoring & Leaderboard ────────────────────────────────

    static async updateScore(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { scoreDelta } = req.body;

            if (scoreDelta === undefined || typeof scoreDelta !== 'number') {
                return next(
                    new ValidationError(
                        'scoreDelta (number) is required',
                        ErrorCode.MISSING_FIELD
                    )
                );
            }

            await tournamentService.updateScore(id, userId, scoreDelta);
            res.status(200).json(success(null, 'Score updated'));
        } catch (error) {
            next(error);
        }
    }

    static async getLeaderboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const leaderboard = await tournamentService.getLeaderboard(id);
            res.status(200).json(success(leaderboard, 'Leaderboard retrieved'));
        } catch (error) {
            next(error);
        }
    }

    static async getUserStanding(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const standing = await tournamentService.getUserStanding(id, userId);
            res.status(200).json(success(standing, 'User standing retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
