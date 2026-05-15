/**
 * GEM Z — Tournament Service
 *
 * Business logic for tournament features:
 * - Tournament CRUD operations
 * - Participant registration and scoring
 * - Leaderboard computation and rankings
 * - Tournament lifecycle management (upcoming/active/completed)
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('tournament-service');

// ─── Types ──────────────────────────────────────────────────────

export type TournamentStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type TournamentType = 'individual' | 'squad' | 'corporate';

export interface Tournament {
    id: string;
    name: string;
    description: string | null;
    type: TournamentType;
    status: TournamentStatus;
    prizePool: number;
    prizePoolUnit: string;
    entryFee: number;
    entryFeeUnit: string;
    maxParticipants: number | null;
    currentParticipants: number;
    startDate: Date;
    endDate: Date;
    rules: string | null;
    imageUrl: string | null;
    createdBy: string;
    gymId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TournamentParticipant {
    id: string;
    tournamentId: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    score: number;
    rank: number | null;
    joinedAt: Date;
    metadata: Record<string, any> | null;
}

export interface TournamentLeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    score: number;
    joinedAt: Date;
}

export interface CreateTournamentInput {
    name: string;
    description?: string;
    type: TournamentType;
    prizePool?: number;
    prizePoolUnit?: string;
    entryFee?: number;
    entryFeeUnit?: string;
    maxParticipants?: number;
    startDate: string;
    endDate: string;
    rules?: string;
    imageUrl?: string;
    gymId?: string;
}

// ─── Service ────────────────────────────────────────────────────

export class TournamentService {
    constructor(private pool: Pool) {}

    // ─── Tournament CRUD ──────────────────────────────────────

    /**
     * Create a new tournament.
     */
    async createTournament(
        createdBy: string,
        data: CreateTournamentInput
    ): Promise<Tournament> {
        if (!data.name || data.name.trim().length === 0) {
            throw new ValidationError('Tournament name is required', ErrorCode.MISSING_FIELD);
        }

        if (!['individual', 'squad', 'corporate'].includes(data.type)) {
            throw new ValidationError(
                'Invalid tournament type. Must be one of: individual, squad, corporate',
                ErrorCode.INVALID_INPUT
            );
        }

        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new ValidationError('Invalid start or end date', ErrorCode.INVALID_INPUT);
        }

        if (endDate <= startDate) {
            throw new ValidationError('End date must be after start date', ErrorCode.INVALID_INPUT);
        }

        const tournamentId = uuidv4();

        try {
            const result = await this.pool.query(
                `
                INSERT INTO tournaments (
                    id, name, description, type, status,
                    prize_pool, prize_pool_unit, entry_fee, entry_fee_unit,
                    max_participants, start_date, end_date,
                    rules, image_url, created_by, gym_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING
                    id,
                    name,
                    description,
                    type,
                    status,
                    prize_pool as "prizePool",
                    prize_pool_unit as "prizePoolUnit",
                    entry_fee as "entryFee",
                    entry_fee_unit as "entryFeeUnit",
                    max_participants as "maxParticipants",
                    0 as "currentParticipants",
                    start_date as "startDate",
                    end_date as "endDate",
                    rules,
                    image_url as "imageUrl",
                    created_by as "createdBy",
                    gym_id as "gymId",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [
                    tournamentId,
                    data.name.trim(),
                    data.description || null,
                    data.type,
                    'upcoming',
                    data.prizePool ?? 0,
                    data.prizePoolUnit ?? 'coins',
                    data.entryFee ?? 0,
                    data.entryFeeUnit ?? 'coins',
                    data.maxParticipants ?? null,
                    startDate,
                    endDate,
                    data.rules || null,
                    data.imageUrl || null,
                    createdBy,
                    data.gymId || null,
                ]
            );

            log.info({ tournamentId, name: data.name, type: data.type }, 'Tournament created');
            return result.rows[0];
        } catch (error) {
            log.error({ error, name: data.name }, 'Failed to create tournament');
            throw new AppError('Failed to create tournament', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * List tournaments with optional filters.
     */
    async listTournaments(filters?: {
        status?: TournamentStatus;
        type?: TournamentType;
        gymId?: string;
        page?: number;
        limit?: number;
    }): Promise<{ tournaments: Tournament[]; total: number }> {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 20;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        if (filters?.status) {
            conditions.push(`status = $${paramIdx}`);
            values.push(filters.status);
            paramIdx++;
        }
        if (filters?.type) {
            conditions.push(`type = $${paramIdx}`);
            values.push(filters.type);
            paramIdx++;
        }
        if (filters?.gymId) {
            conditions.push(`gym_id = $${paramIdx}`);
            values.push(filters.gymId);
            paramIdx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Auto-update status for date-based transitions
        await this.pool.query(
            `
            UPDATE tournaments
            SET status = CASE
                WHEN NOW() < start_date THEN 'upcoming'
                WHEN NOW() BETWEEN start_date AND end_date THEN 'active'
                WHEN NOW() > end_date THEN 'completed'
            END
            WHERE status NOT IN ('cancelled')
            `
        );

        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM tournaments ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const result = await this.pool.query(
            `
            SELECT
                id, name, description, type, status,
                prize_pool as "prizePool",
                prize_pool_unit as "prizePoolUnit",
                entry_fee as "entryFee",
                entry_fee_unit as "entryFeeUnit",
                max_participants as "maxParticipants",
                (
                    SELECT COUNT(*) FROM tournament_participants tp
                    WHERE tp.tournament_id = tournaments.id
                ) as "currentParticipants",
                start_date as "startDate",
                end_date as "endDate",
                rules,
                image_url as "imageUrl",
                created_by as "createdBy",
                gym_id as "gymId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM tournaments
            ${whereClause}
            ORDER BY
                CASE status
                    WHEN 'active' THEN 1
                    WHEN 'upcoming' THEN 2
                    WHEN 'completed' THEN 3
                    ELSE 4
                END,
                start_date ASC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
            `,
            [...values, limit, offset]
        );

        return { tournaments: result.rows, total };
    }

    /**
     * Get tournament details by ID including participant count.
     */
    async getTournament(tournamentId: string): Promise<Tournament> {
        const result = await this.pool.query(
            `
            SELECT
                id, name, description, type, status,
                prize_pool as "prizePool",
                prize_pool_unit as "prizePoolUnit",
                entry_fee as "entryFee",
                entry_fee_unit as "entryFeeUnit",
                max_participants as "maxParticipants",
                (
                    SELECT COUNT(*) FROM tournament_participants tp
                    WHERE tp.tournament_id = tournaments.id
                ) as "currentParticipants",
                start_date as "startDate",
                end_date as "endDate",
                rules,
                image_url as "imageUrl",
                created_by as "createdBy",
                gym_id as "gymId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM tournaments
            WHERE id = $1
            `,
            [tournamentId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Tournament not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        return result.rows[0];
    }

    /**
     * Update a tournament. Only the creator can update.
     */
    async updateTournament(
        tournamentId: string,
        userId: string,
        data: Partial<CreateTournamentInput>
    ): Promise<Tournament> {
        await this.assertTournamentCreator(tournamentId, userId);

        const existing = await this.getTournament(tournamentId);
        if (existing.status === 'completed' || existing.status === 'cancelled') {
            throw new ValidationError(
                'Cannot update a completed or cancelled tournament',
                ErrorCode.INVALID_INPUT
            );
        }

        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [tournamentId];
        let paramIdx = 2;

        if (data.name !== undefined) {
            updates.push(`name = $${paramIdx}`);
            values.push(data.name.trim());
            paramIdx++;
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIdx}`);
            values.push(data.description);
            paramIdx++;
        }
        if (data.prizePool !== undefined) {
            updates.push(`prize_pool = $${paramIdx}`);
            values.push(data.prizePool);
            paramIdx++;
        }
        if (data.entryFee !== undefined) {
            updates.push(`entry_fee = $${paramIdx}`);
            values.push(data.entryFee);
            paramIdx++;
        }
        if (data.maxParticipants !== undefined) {
            updates.push(`max_participants = $${paramIdx}`);
            values.push(data.maxParticipants);
            paramIdx++;
        }
        if (data.startDate !== undefined) {
            updates.push(`start_date = $${paramIdx}`);
            values.push(new Date(data.startDate));
            paramIdx++;
        }
        if (data.endDate !== undefined) {
            updates.push(`end_date = $${paramIdx}`);
            values.push(new Date(data.endDate));
            paramIdx++;
        }
        if (data.rules !== undefined) {
            updates.push(`rules = $${paramIdx}`);
            values.push(data.rules);
            paramIdx++;
        }
        if (data.imageUrl !== undefined) {
            updates.push(`image_url = $${paramIdx}`);
            values.push(data.imageUrl);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            UPDATE tournaments
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING
                id, name, description, type, status,
                prize_pool as "prizePool",
                prize_pool_unit as "prizePoolUnit",
                entry_fee as "entryFee",
                entry_fee_unit as "entryFeeUnit",
                max_participants as "maxParticipants",
                0 as "currentParticipants",
                start_date as "startDate",
                end_date as "endDate",
                rules,
                image_url as "imageUrl",
                created_by as "createdBy",
                gym_id as "gymId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            values
        );

        log.info({ tournamentId, userId }, 'Tournament updated');
        return result.rows[0];
    }

    /**
     * Delete a tournament. Only the creator can delete.
     */
    async deleteTournament(tournamentId: string, userId: string): Promise<void> {
        await this.assertTournamentCreator(tournamentId, userId);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM tournament_participants WHERE tournament_id = $1`, [tournamentId]);
            await client.query(`DELETE FROM tournaments WHERE id = $1`, [tournamentId]);
            await client.query('COMMIT');

            log.info({ tournamentId, userId }, 'Tournament deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, tournamentId, userId }, 'Failed to delete tournament');
            throw new AppError('Failed to delete tournament', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Participant Management ───────────────────────────────

    /**
     * Join a tournament.
     */
    async joinTournament(tournamentId: string, userId: string): Promise<void> {
        const tournament = await this.getTournament(tournamentId);

        if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
            throw new ValidationError(
                'Tournament is not open for registration',
                ErrorCode.INVALID_INPUT
            );
        }

        if (
            tournament.maxParticipants &&
            tournament.currentParticipants >= tournament.maxParticipants
        ) {
            throw new ConflictError('Tournament is full', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        // Check if already joined
        const existing = await this.pool.query(
            `SELECT 1 FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
            [tournamentId, userId]
        );
        if (existing.rows.length > 0) {
            throw new ConflictError(
                'Already registered for this tournament',
                ErrorCode.CONFLICT_DUPLICATE_RESOURCE
            );
        }

        await this.pool.query(
            `
            INSERT INTO tournament_participants (id, tournament_id, user_id, score, rank, metadata)
            VALUES ($1, $2, $3, 0, NULL, '{}')
            `,
            [uuidv4(), tournamentId, userId]
        );

        log.info({ tournamentId, userId }, 'User joined tournament');
    }

    /**
     * Leave a tournament.
     */
    async leaveTournament(tournamentId: string, userId: string): Promise<void> {
        const tournament = await this.getTournament(tournamentId);
        if (tournament.status === 'completed') {
            throw new ValidationError(
                'Cannot leave a completed tournament',
                ErrorCode.INVALID_INPUT
            );
        }

        const result = await this.pool.query(
            `DELETE FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
            [tournamentId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError(
                'Not registered for this tournament',
                ErrorCode.NOT_FOUND_RESOURCE
            );
        }

        log.info({ tournamentId, userId }, 'User left tournament');
    }

    // ─── Scoring & Leaderboard ────────────────────────────────

    /**
     * Update participant score.
     */
    async updateScore(
        tournamentId: string,
        userId: string,
        scoreDelta: number
    ): Promise<void> {
        const tournament = await this.getTournament(tournamentId);
        if (tournament.status !== 'active') {
            throw new ValidationError(
                'Can only update scores for active tournaments',
                ErrorCode.INVALID_INPUT
            );
        }

        const result = await this.pool.query(
            `
            UPDATE tournament_participants
            SET score = score + $3
            WHERE tournament_id = $1 AND user_id = $2
            `,
            [tournamentId, userId, scoreDelta]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError(
                'Participant not found in tournament',
                ErrorCode.NOT_FOUND_USER
            );
        }

        log.info({ tournamentId, userId, scoreDelta }, 'Score updated');
    }

    /**
     * Get tournament leaderboard.
     */
    async getLeaderboard(tournamentId: string): Promise<TournamentLeaderboardEntry[]> {
        // Verify tournament exists
        await this.getTournament(tournamentId);

        // Recalculate ranks
        await this.pool.query(
            `
            WITH ranked AS (
                SELECT
                    id,
                    RANK() OVER (ORDER BY score DESC, joined_at ASC) as new_rank
                FROM tournament_participants
                WHERE tournament_id = $1
            )
            UPDATE tournament_participants tp
            SET rank = r.new_rank
            FROM ranked r
            WHERE tp.id = r.id
            `,
            [tournamentId]
        );

        const result = await this.pool.query(
            `
            SELECT
                tp.rank as "rank",
                tp.user_id as "userId",
                u.full_name as "userName",
                u.avatar_url as "userAvatar",
                tp.score,
                tp.joined_at as "joinedAt"
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.tournament_id = $1
            ORDER BY tp.rank ASC NULLS LAST, tp.score DESC
            LIMIT 100
            `,
            [tournamentId]
        );

        return result.rows;
    }

    /**
     * Get user's rank and score in a tournament.
     */
    async getUserStanding(
        tournamentId: string,
        userId: string
    ): Promise<{ rank: number; score: number; totalParticipants: number } | null> {
        const result = await this.pool.query(
            `
            SELECT
                tp.rank,
                tp.score,
                (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = $1) as "totalParticipants"
            FROM tournament_participants tp
            WHERE tp.tournament_id = $1 AND tp.user_id = $2
            `,
            [tournamentId, userId]
        );

        if (result.rows.length === 0) return null;
        return {
            rank: result.rows[0].rank,
            score: Number(result.rows[0].score),
            totalParticipants: Number(result.rows[0].totalParticipants),
        };
    }

    // ─── Helpers ──────────────────────────────────────────────

    private async assertTournamentCreator(
        tournamentId: string,
        userId: string
    ): Promise<void> {
        const result = await this.pool.query(
            `SELECT created_by FROM tournaments WHERE id = $1`,
            [tournamentId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Tournament not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (result.rows[0].created_by !== userId) {
            throw new ForbiddenError(
                'Only the tournament creator can perform this action',
                ErrorCode.FORBIDDEN_RESOURCE_ACCESS
            );
        }
    }
}
