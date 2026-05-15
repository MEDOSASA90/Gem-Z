/**
 * GEM Z — Community Challenges Service
 *
 * Business logic for community-wide fitness challenges:
 * - Create and manage community challenges
 * - Join/leave challenges
 * - Track participant progress
 * - Leaderboards and completion tracking
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('community-service');

// ─── Types ──────────────────────────────────────────────────────

export interface CommunityChallenge {
    id: string;
    title: string;
    description: string | null;
    challengeType: 'steps' | 'distance' | 'calories' | 'workouts' | 'water' | 'sleep' | 'custom';
    targetValue: number;
    unit: string;
    startDate: Date;
    endDate: Date;
    createdBy: string | null;
    isPublic: boolean;
    maxParticipants: number | null;
    reward: string | null;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    creatorName?: string;
    isJoined?: boolean;
    userProgress?: number;
}

export interface ChallengeParticipant {
    id: string;
    challengeId: string;
    userId: string;
    progress: number;
    completed: boolean;
    completedAt: Date | null;
    rank: number;
    joinedAt: Date;
    userName?: string;
    userAvatar?: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    progress: number;
    completed: boolean;
    completedAt: Date | null;
}

// ─── Service ────────────────────────────────────────────────────

export class CommunityService {
    constructor(private pool: Pool) {}

    // ─── Challenge CRUD ───────────────────────────────────────

    /**
     * Create a new community challenge.
     */
    async createChallenge(
        userId: string,
        data: {
            title: string;
            description?: string;
            challengeType: string;
            targetValue: number;
            unit: string;
            startDate: Date;
            endDate: Date;
            isPublic?: boolean;
            maxParticipants?: number;
            reward?: string;
        }
    ): Promise<CommunityChallenge> {
        if (!data.title || data.title.trim().length === 0) {
            throw new ValidationError('Challenge title is required', ErrorCode.MISSING_FIELD);
        }

        if (data.title.length > 200) {
            throw new ValidationError('Title exceeds 200 characters', ErrorCode.INVALID_INPUT);
        }

        if (data.targetValue <= 0) {
            throw new ValidationError('Target value must be greater than 0', ErrorCode.INVALID_INPUT);
        }

        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (startDate >= endDate) {
            throw new ValidationError('End date must be after start date', ErrorCode.INVALID_INPUT);
        }

        const now = new Date();
        let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
        if (startDate <= now && endDate >= now) status = 'active';
        else if (endDate < now) status = 'completed';

        const challengeId = uuidv4();

        try {
            const result = await this.pool.query(
                `
                INSERT INTO community_challenges (
                    id, title, description, challenge_type, target_value, unit,
                    start_date, end_date, created_by, is_public, max_participants, reward, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING
                    id,
                    title,
                    description,
                    challenge_type as "challengeType",
                    target_value as "targetValue",
                    unit,
                    start_date as "startDate",
                    end_date as "endDate",
                    created_by as "createdBy",
                    is_public as "isPublic",
                    max_participants as "maxParticipants",
                    reward,
                    status,
                    created_at as "createdAt",
                    updated_at as "updatedAt",
                    0 as "participantCount"
                `,
                [
                    challengeId,
                    data.title.trim(),
                    data.description || null,
                    data.challengeType,
                    data.targetValue,
                    data.unit,
                    startDate,
                    endDate,
                    userId,
                    data.isPublic ?? true,
                    data.maxParticipants || null,
                    data.reward || null,
                    status,
                ]
            );

            log.info({ challengeId, userId, title: data.title }, 'Community challenge created');
            return { ...result.rows[0], isJoined: true };
        } catch (error) {
            log.error({ error, userId }, 'Failed to create challenge');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to create challenge', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * List community challenges.
     */
    async listChallenges(
        userId: string,
        filters?: { status?: string; type?: string; mine?: boolean }
    ): Promise<CommunityChallenge[]> {
        const { status, type, mine } = filters || {};

        let whereClause = 'WHERE cc.is_public = TRUE';
        const params: any[] = [userId];
        let paramIdx = 2;

        if (mine) {
            whereClause = 'WHERE cc.created_by = $1';
        } else {
            whereClause += ' OR cc.created_by = $1';
        }

        if (status) {
            whereClause += ` AND cc.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }

        if (type) {
            whereClause += ` AND cc.challenge_type = $${paramIdx}`;
            params.push(type);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            SELECT
                cc.id,
                cc.title,
                cc.description,
                cc.challenge_type as "challengeType",
                cc.target_value as "targetValue",
                cc.unit,
                cc.start_date as "startDate",
                cc.end_date as "endDate",
                cc.created_by as "createdBy",
                cc.is_public as "isPublic",
                cc.max_participants as "maxParticipants",
                cc.reward,
                cc.status,
                cc.created_at as "createdAt",
                cc.updated_at as "updatedAt",
                COALESCE(p_counts.count, 0) as "participantCount",
                u.full_name as "creatorName",
                EXISTS (
                    SELECT 1 FROM challenge_participants cp2
                    WHERE cp2.challenge_id = cc.id AND cp2.user_id = $1
                ) as "isJoined",
                (
                    SELECT cp3.progress FROM challenge_participants cp3
                    WHERE cp3.challenge_id = cc.id AND cp3.user_id = $1
                ) as "userProgress"
            FROM community_challenges cc
            LEFT JOIN (
                SELECT challenge_id, COUNT(*) as count
                FROM challenge_participants
                GROUP BY challenge_id
            ) p_counts ON p_counts.challenge_id = cc.id
            LEFT JOIN users u ON cc.created_by = u.id
            ${whereClause}
            ORDER BY cc.start_date DESC
            LIMIT 100
            `,
            params
        );

        return result.rows.map((row: any) => ({
            ...row,
            isJoined: row.isJoined,
            participantCount: parseInt(row.participantCount, 10),
            userProgress: row.userProgress ? parseFloat(row.userProgress) : undefined,
        }));
    }

    /**
     * Get challenge details with leaderboard.
     */
    async getChallenge(challengeId: string, userId: string): Promise<{
        challenge: CommunityChallenge;
        leaderboard: LeaderboardEntry[];
    }> {
        const challengeResult = await this.pool.query(
            `
            SELECT
                cc.id,
                cc.title,
                cc.description,
                cc.challenge_type as "challengeType",
                cc.target_value as "targetValue",
                cc.unit,
                cc.start_date as "startDate",
                cc.end_date as "endDate",
                cc.created_by as "createdBy",
                cc.is_public as "isPublic",
                cc.max_participants as "maxParticipants",
                cc.reward,
                cc.status,
                cc.created_at as "createdAt",
                cc.updated_at as "updatedAt",
                COALESCE(p_counts.count, 0) as "participantCount",
                u.full_name as "creatorName",
                EXISTS (
                    SELECT 1 FROM challenge_participants cp2
                    WHERE cp2.challenge_id = cc.id AND cp2.user_id = $2
                ) as "isJoined",
                (
                    SELECT cp3.progress FROM challenge_participants cp3
                    WHERE cp3.challenge_id = cc.id AND cp3.user_id = $2
                ) as "userProgress"
            FROM community_challenges cc
            LEFT JOIN (
                SELECT challenge_id, COUNT(*) as count
                FROM challenge_participants
                GROUP BY challenge_id
            ) p_counts ON p_counts.challenge_id = cc.id
            LEFT JOIN users u ON cc.created_by = u.id
            WHERE cc.id = $1
            `,
            [challengeId, userId]
        );

        if (challengeResult.rows.length === 0) {
            throw new NotFoundError('Challenge not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const challenge = {
            ...challengeResult.rows[0],
            isJoined: challengeResult.rows[0].isJoined,
            participantCount: parseInt(challengeResult.rows[0].participantCount, 10),
        };

        // Get leaderboard
        const leaderboardResult = await this.pool.query(
            `
            SELECT
                cp.user_id as "userId",
                u.full_name as "userName",
                u.avatar_url as "userAvatar",
                cp.progress,
                cp.completed,
                cp.completed_at as "completedAt",
                RANK() OVER (ORDER BY cp.progress DESC, cp.completed_at ASC NULLS LAST) as rank
            FROM challenge_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.challenge_id = $1
            ORDER BY cp.progress DESC, cp.completed_at ASC NULLS LAST
            LIMIT 50
            `,
            [challengeId]
        );

        const leaderboard: LeaderboardEntry[] = leaderboardResult.rows.map((row: any) => ({
            rank: parseInt(row.rank, 10),
            userId: row.userId,
            userName: row.userName,
            userAvatar: row.userAvatar,
            progress: parseFloat(row.progress),
            completed: row.completed,
            completedAt: row.completedAt,
        }));

        return { challenge, leaderboard };
    }

    /**
     * Join a challenge.
     */
    async joinChallenge(challengeId: string, userId: string): Promise<void> {
        // Verify challenge exists and is active
        const challengeResult = await this.pool.query(
            `SELECT id, status, max_participants, (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = $1) as participant_count FROM community_challenges WHERE id = $1`,
            [challengeId]
        );

        if (challengeResult.rows.length === 0) {
            throw new NotFoundError('Challenge not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const challenge = challengeResult.rows[0];

        if (challenge.status === 'cancelled') {
            throw new ValidationError('This challenge has been cancelled', ErrorCode.INVALID_INPUT);
        }

        if (challenge.max_participants && parseInt(challenge.participant_count) >= parseInt(challenge.max_participants)) {
            throw new ValidationError('Challenge is full', ErrorCode.INVALID_INPUT);
        }

        // Check if already joined
        const existingResult = await this.pool.query(
            'SELECT 1 FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
            [challengeId, userId]
        );

        if (existingResult.rows.length > 0) {
            throw new ConflictError('Already joined this challenge', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        await this.pool.query(
            `
            INSERT INTO challenge_participants (id, challenge_id, user_id, progress)
            VALUES ($1, $2, $3, 0)
            `,
            [uuidv4(), challengeId, userId]
        );

        log.info({ challengeId, userId }, 'User joined challenge');
    }

    /**
     * Leave a challenge.
     */
    async leaveChallenge(challengeId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            'DELETE FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2 RETURNING id',
            [challengeId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Not a participant of this challenge', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ challengeId, userId }, 'User left challenge');
    }

    /**
     * Update participant progress.
     */
    async updateProgress(
        challengeId: string,
        userId: string,
        progress: number
    ): Promise<{ completed: boolean }> {
        if (progress < 0) {
            throw new ValidationError('Progress cannot be negative', ErrorCode.INVALID_INPUT);
        }

        // Get challenge target
        const challengeResult = await this.pool.query(
            'SELECT target_value FROM community_challenges WHERE id = $1',
            [challengeId]
        );

        if (challengeResult.rows.length === 0) {
            throw new NotFoundError('Challenge not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const targetValue = parseFloat(challengeResult.rows[0].target_value);
        const completed = progress >= targetValue;

        await this.pool.query(
            `
            UPDATE challenge_participants
            SET
                progress = $3,
                completed = $4,
                completed_at = CASE WHEN $4 = TRUE AND completed = FALSE THEN NOW() ELSE completed_at END
            WHERE challenge_id = $1 AND user_id = $2
            `,
            [challengeId, userId, progress, completed]
        );

        log.info({ challengeId, userId, progress, completed }, 'Challenge progress updated');
        return { completed };
    }

    /**
     * Delete a challenge (creator or admin only).
     */
    async deleteChallenge(challengeId: string, userId: string): Promise<void> {
        const challengeResult = await this.pool.query(
            'SELECT created_by FROM community_challenges WHERE id = $1',
            [challengeId]
        );

        if (challengeResult.rows.length === 0) {
            throw new NotFoundError('Challenge not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (challengeResult.rows[0].created_by !== userId) {
            throw new ForbiddenError('Only the creator can delete this challenge', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM challenge_participants WHERE challenge_id = $1', [challengeId]);
            await client.query('DELETE FROM community_challenges WHERE id = $1', [challengeId]);
            await client.query('COMMIT');
            log.info({ challengeId, userId }, 'Challenge deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            throw new AppError('Failed to delete challenge', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }
}
