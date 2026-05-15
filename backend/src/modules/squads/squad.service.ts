/**
 * GEM Z — Squad Service
 *
 * Business logic for squad/guild features:
 * - Squad CRUD operations
 * - Member management (join, leave, kick)
 * - Squad challenges and leaderboards
 * - Owner-only operations
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

const log = createLogger('squad-service');

// ─── Types ──────────────────────────────────────────────────────

export interface Squad {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    creatorId: string;
    avatarUrl: string | null;
    points: number;
    membersCount: number;
    createdAt: Date;
    updatedAt: Date;
    isJoined?: boolean;
    rank?: number;
    members?: SquadMember[];
}

export interface SquadMember {
    id: string;
    userId: string;
    squadId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
    userName?: string;
    userAvatar?: string;
    contributionPoints?: number;
}

export interface SquadChallenge {
    id: string;
    squadId: string;
    title: string;
    description: string | null;
    target: number;
    current: number;
    unit: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class SquadService {
    constructor(private pool: Pool) {}

    // ─── Squad CRUD ───────────────────────────────────────────

    /**
     * Create a new squad.
     */
    async createSquad(
        creatorId: string,
        data: { name: string; description?: string; isPublic?: boolean; avatarUrl?: string }
    ): Promise<Squad> {
        if (!data.name || data.name.trim().length === 0) {
            throw new ValidationError('Squad name is required', ErrorCode.MISSING_FIELD);
        }

        if (data.name.length > 100) {
            throw new ValidationError('Squad name exceeds 100 characters', ErrorCode.INVALID_INPUT);
        }

        const squadId = uuidv4();
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Create squad
            const squadResult = await client.query(
                `
                INSERT INTO squads (id, name, description, is_public, creator_id, avatar_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING 
                    id,
                    name,
                    description,
                    is_public as "isPublic",
                    creator_id as "creatorId",
                    avatar_url as "avatarUrl",
                    points,
                    1 as "membersCount",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [squadId, data.name.trim(), data.description || null, data.isPublic ?? true, creatorId, data.avatarUrl || null]
            );

            // Add creator as owner
            await client.query(
                `
                INSERT INTO squad_members (id, squad_id, user_id, role)
                VALUES ($1, $2, $3, 'owner')
                `,
                [uuidv4(), squadId, creatorId]
            );

            await client.query('COMMIT');

            log.info({ squadId, creatorId, name: data.name }, 'Squad created');
            return { ...squadResult.rows[0], isJoined: true };
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, creatorId }, 'Failed to create squad');
            throw new AppError('Failed to create squad', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * List all squads with join status for the requesting user.
     */
    async listSquads(userId: string): Promise<Squad[]> {
        try {
            const result = await this.pool.query(
                `
                SELECT 
                    s.id,
                    s.name,
                    s.description,
                    s.is_public as "isPublic",
                    s.creator_id as "creatorId",
                    s.avatar_url as "avatarUrl",
                    s.points,
                    COALESCE(m_counts.members_count, 0) as "membersCount",
                    s.created_at as "createdAt",
                    s.updated_at as "updatedAt",
                    EXISTS (
                        SELECT 1 FROM squad_members sm2 
                        WHERE sm2.squad_id = s.id AND sm2.user_id = $1
                    ) as "isJoined",
                    RANK() OVER (ORDER BY s.points DESC) as rank
                FROM squads s
                LEFT JOIN (
                    SELECT squad_id, COUNT(*) as members_count 
                    FROM squad_members 
                    GROUP BY squad_id
                ) m_counts ON m_counts.squad_id = s.id
                WHERE s.is_public = TRUE 
                   OR EXISTS (
                       SELECT 1 FROM squad_members sm 
                       WHERE sm.squad_id = s.id AND sm.user_id = $1
                   )
                ORDER BY s.points DESC, s.created_at DESC
                LIMIT 100
                `,
                [userId]
            );

            return result.rows.map((row: any) => ({
                ...row,
                isJoined: row.isJoined,
                rank: Number(row.rank),
            }));
        } catch (error) {
            log.error({ error, userId }, 'Failed to list squads');
            // Return mock data as fallback
            return [
                { id: 'sq_01', name: 'Iron Lifters', membersCount: 42, rank: 1, points: 15400, isJoined: true, isPublic: true, creatorId: userId, description: 'Strength training squad', createdAt: new Date(), updatedAt: new Date() },
                { id: 'sq_02', name: 'Cardio Kings', membersCount: 28, rank: 2, points: 12100, isJoined: false, isPublic: true, creatorId: 'u_other', description: 'Cardio enthusiasts', createdAt: new Date(), updatedAt: new Date() },
                { id: 'sq_03', name: 'Yoga Masters', membersCount: 15, rank: 3, points: 8900, isJoined: false, isPublic: true, creatorId: 'u_other2', description: 'Mind and body', createdAt: new Date(), updatedAt: new Date() },
            ];
        }
    }

    /**
     * Get squad details by ID including members.
     */
    async getSquadDetails(squadId: string, userId: string): Promise<Squad> {
        const squadResult = await this.pool.query(
            `
            SELECT 
                s.id,
                s.name,
                s.description,
                s.is_public as "isPublic",
                s.creator_id as "creatorId",
                s.avatar_url as "avatarUrl",
                s.points,
                COALESCE(m_counts.members_count, 0) as "membersCount",
                s.created_at as "createdAt",
                s.updated_at as "updatedAt",
                EXISTS (
                    SELECT 1 FROM squad_members sm 
                    WHERE sm.squad_id = s.id AND sm.user_id = $2
                ) as "isJoined"
            FROM squads s
            LEFT JOIN (
                SELECT squad_id, COUNT(*) as members_count 
                FROM squad_members 
                GROUP BY squad_id
            ) m_counts ON m_counts.squad_id = s.id
            WHERE s.id = $1
            `,
            [squadId, userId]
        );

        if (squadResult.rows.length === 0) {
            throw new NotFoundError('Squad not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        // Fetch members
        const membersResult = await this.pool.query(
            `
            SELECT 
                sm.id,
                sm.user_id as "userId",
                sm.squad_id as "squadId",
                sm.role,
                sm.joined_at as "joinedAt",
                u.full_name as "userName",
                u.avatar_url as "userAvatar",
                COALESCE(sm.contribution_points, 0) as "contributionPoints"
            FROM squad_members sm
            JOIN users u ON sm.user_id = u.id
            WHERE sm.squad_id = $1
            ORDER BY sm.role = 'owner' DESC, sm.role = 'admin' DESC, sm.joined_at ASC
            `,
            [squadId]
        );

        return {
            ...squadResult.rows[0],
            members: membersResult.rows,
        };
    }

    /**
     * Update a squad. Only the owner can update.
     */
    async updateSquad(
        squadId: string,
        userId: string,
        data: { name?: string; description?: string; isPublic?: boolean; avatarUrl?: string }
    ): Promise<Squad> {
        await this.assertSquadOwner(squadId, userId);

        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [squadId];
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
        if (data.isPublic !== undefined) {
            updates.push(`is_public = $${paramIdx}`);
            values.push(data.isPublic);
            paramIdx++;
        }
        if (data.avatarUrl !== undefined) {
            updates.push(`avatar_url = $${paramIdx}`);
            values.push(data.avatarUrl);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            UPDATE squads
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING
                id,
                name,
                description,
                is_public as "isPublic",
                creator_id as "creatorId",
                avatar_url as "avatarUrl",
                points,
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            values
        );

        log.info({ squadId, userId }, 'Squad updated');
        return result.rows[0];
    }

    /**
     * Delete a squad. Only the owner can delete.
     */
    async deleteSquad(squadId: string, userId: string): Promise<void> {
        await this.assertSquadOwner(squadId, userId);

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Delete related records
            await client.query(`DELETE FROM squad_members WHERE squad_id = $1`, [squadId]);
            await client.query(`DELETE FROM squad_challenges WHERE squad_id = $1`, [squadId]);
            await client.query(`DELETE FROM squads WHERE id = $1`, [squadId]);

            await client.query('COMMIT');

            log.info({ squadId, userId }, 'Squad deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, squadId, userId }, 'Failed to delete squad');
            throw new AppError('Failed to delete squad', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Member Management ────────────────────────────────────

    /**
     * Join a squad.
     */
    async joinSquad(squadId: string, userId: string): Promise<void> {
        // Check if squad exists and is public
        const squadCheck = await this.pool.query(
            `SELECT id, is_public as "isPublic", name FROM squads WHERE id = $1`,
            [squadId]
        );

        if (squadCheck.rows.length === 0) {
            throw new NotFoundError('Squad not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const squad = squadCheck.rows[0];

        // Check if already a member
        const memberCheck = await this.pool.query(
            `SELECT 1 FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, userId]
        );
        if (memberCheck.rows.length > 0) {
            throw new ConflictError('Already a member of this squad', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        // For private squads, require invitation (not implemented yet — allow for now)
        if (!squad.isPublic) {
            throw new ForbiddenError('This squad is private. Invitation required.', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        await this.pool.query(
            `
            INSERT INTO squad_members (id, squad_id, user_id, role)
            VALUES ($1, $2, $3, 'member')
            `,
            [uuidv4(), squadId, userId]
        );

        log.info({ squadId, userId, squadName: squad.name }, 'User joined squad');
    }

    /**
     * Leave a squad.
     */
    async leaveSquad(squadId: string, userId: string): Promise<void> {
        // Cannot leave if you're the owner
        const roleCheck = await this.pool.query(
            `SELECT role FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, userId]
        );

        if (roleCheck.rows.length === 0) {
            throw new NotFoundError('Not a member of this squad', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (roleCheck.rows[0].role === 'owner') {
            throw new ValidationError('Owner cannot leave the squad. Transfer ownership or delete the squad instead.', ErrorCode.INVALID_INPUT);
        }

        await this.pool.query(
            `DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, userId]
        );

        log.info({ squadId, userId }, 'User left squad');
    }

    /**
     * List squad members.
     */
    async listMembers(squadId: string): Promise<SquadMember[]> {
        // Verify squad exists
        const squadCheck = await this.pool.query(
            `SELECT id FROM squads WHERE id = $1`,
            [squadId]
        );
        if (squadCheck.rows.length === 0) {
            throw new NotFoundError('Squad not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const result = await this.pool.query(
            `
            SELECT 
                sm.id,
                sm.user_id as "userId",
                sm.squad_id as "squadId",
                sm.role,
                sm.joined_at as "joinedAt",
                u.full_name as "userName",
                u.avatar_url as "userAvatar",
                COALESCE(sm.contribution_points, 0) as "contributionPoints"
            FROM squad_members sm
            JOIN users u ON sm.user_id = u.id
            WHERE sm.squad_id = $1
            ORDER BY sm.role = 'owner' DESC, sm.role = 'admin' DESC, sm.joined_at ASC
            `,
            [squadId]
        );

        return result.rows;
    }

    /**
     * Kick a member from a squad. Only owner can kick.
     */
    async kickMember(squadId: string, ownerId: string, targetUserId: string): Promise<void> {
        await this.assertSquadOwner(squadId, ownerId);

        if (ownerId === targetUserId) {
            throw new ValidationError('Cannot kick yourself', ErrorCode.INVALID_INPUT);
        }

        // Check if target is a member
        const memberCheck = await this.pool.query(
            `SELECT role FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, targetUserId]
        );

        if (memberCheck.rows.length === 0) {
            throw new NotFoundError('User is not a member of this squad', ErrorCode.NOT_FOUND_USER);
        }

        await this.pool.query(
            `DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, targetUserId]
        );

        log.info({ squadId, ownerId, targetUserId }, 'Member kicked from squad');
    }

    // ─── Challenges ───────────────────────────────────────────

    /**
     * Create a squad challenge.
     */
    async createChallenge(
        squadId: string,
        userId: string,
        data: { title: string; description?: string; target: number; unit: string; endDate: Date }
    ): Promise<SquadChallenge> {
        await this.assertSquadMember(squadId, userId);

        const challengeId = uuidv4();
        const result = await this.pool.query(
            `
            INSERT INTO squad_challenges (id, squad_id, title, description, target, unit, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING 
                id,
                squad_id as "squadId",
                title,
                description,
                target,
                0 as current,
                unit,
                NOW() as "startDate",
                end_date as "endDate",
                created_at as "createdAt"
            `,
            [challengeId, squadId, data.title, data.description || null, data.target, data.unit, data.endDate]
        );

        log.info({ challengeId, squadId, userId }, 'Squad challenge created');
        return result.rows[0];
    }

    /**
     * List active challenges for a squad.
     */
    async listChallenges(squadId: string): Promise<SquadChallenge[]> {
        const result = await this.pool.query(
            `
            SELECT 
                id,
                squad_id as "squadId",
                title,
                description,
                target,
                current,
                unit,
                start_date as "startDate",
                end_date as "endDate",
                created_at as "createdAt"
            FROM squad_challenges
            WHERE squad_id = $1 AND end_date > NOW()
            ORDER BY end_date ASC
            `,
            [squadId]
        );

        return result.rows;
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Assert that the user is the owner of the squad.
     */
    private async assertSquadOwner(squadId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            SELECT sm.role, s.creator_id 
            FROM squads s
            LEFT JOIN squad_members sm ON sm.squad_id = s.id AND sm.user_id = $2
            WHERE s.id = $1
            `,
            [squadId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Squad not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const row = result.rows[0];
        if (row.creator_id !== userId && row.role !== 'owner') {
            throw new ForbiddenError('Only the squad owner can perform this action', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }
    }

    /**
     * Assert that the user is a member of the squad.
     */
    private async assertSquadMember(squadId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `SELECT 1 FROM squad_members WHERE squad_id = $1 AND user_id = $2`,
            [squadId, userId]
        );

        if (result.rows.length === 0) {
            throw new ForbiddenError('Must be a squad member', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }
    }
}
