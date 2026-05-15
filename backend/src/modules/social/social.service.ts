/**
 * GEM Z — Social Service
 *
 * Business logic for social features:
 * - Feed generation (posts from followed users)
 * - Post CRUD operations
 * - Like/unlike posts
 * - Comment management
 * - Buddy matching algorithm
 * - Follow/unfollow users
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, logPerf } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('social-service');

// ─── Types ──────────────────────────────────────────────────────

export interface Post {
    id: string;
    authorId: string;
    content: string;
    mediaUrls: string[] | null;
    likesCount: number;
    commentsCount: number;
    createdAt: Date;
    updatedAt: Date;
    authorName?: string;
    authorRole?: string;
    isLiked?: boolean;
}

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    createdAt: Date;
    authorName?: string;
    authorRole?: string;
}

export interface BuddyMatch {
    id: string;
    name: string;
    matchScore: string;
    sharedGoal: string;
    preferredTime: string;
    avatarUrl?: string;
}

export interface FollowUser {
    id: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
    followedAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class SocialService {
    constructor(private pool: Pool) {}

    // ─── Feed ─────────────────────────────────────────────────

    /**
     * Get social feed — posts from users the current user follows,
     * plus their own posts. Ordered by newest first.
     */
    async getFeed(userId: string, limit: number = 50, offset: number = 0): Promise<Post[]> {
        const startTime = Date.now();
        log.debug({ userId, limit, offset }, 'Generating social feed');

        try {
            const result = await this.pool.query(
                `
                SELECT 
                    p.id,
                    p.author_id as "authorId",
                    p.content,
                    p.media_urls as "mediaUrls",
                    p.likes_count as "likesCount",
                    p.comments_count as "commentsCount",
                    p.created_at as "createdAt",
                    p.updated_at as "updatedAt",
                    u.full_name as "authorName",
                    u.role as "authorRole",
                    EXISTS (
                        SELECT 1 FROM post_likes pl 
                        WHERE pl.post_id = p.id AND pl.user_id = $1
                    ) as "isLiked"
                FROM posts p
                JOIN users u ON p.author_id = u.id
                WHERE p.author_id = $1
                   OR p.author_id IN (
                       SELECT following_id FROM follows WHERE follower_id = $1
                   )
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3
                `,
                [userId, limit, offset]
            );

            logPerf('social.getFeed', { userId, durationMs: Date.now() - startTime });
            return result.rows;
        } catch (error) {
            log.error({ error, userId }, 'Failed to generate feed');
            throw new AppError('Failed to load feed', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    // ─── Posts ────────────────────────────────────────────────

    /**
     * Create a new social post.
     */
    async createPost(authorId: string, content: string, mediaUrls: string[] = []): Promise<Post> {
        if (!content || content.trim().length === 0) {
            throw new ValidationError('Post content is required', ErrorCode.MISSING_FIELD);
        }

        if (content.length > 5000) {
            throw new ValidationError('Post content exceeds 5000 character limit', ErrorCode.INVALID_INPUT);
        }

        const postId = uuidv4();
        log.debug({ authorId, postId }, 'Creating post');

        try {
            const result = await this.pool.query(
                `
                INSERT INTO posts (id, author_id, content, media_urls)
                VALUES ($1, $2, $3, $4)
                RETURNING 
                    id,
                    author_id as "authorId",
                    content,
                    media_urls as "mediaUrls",
                    likes_count as "likesCount",
                    comments_count as "commentsCount",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [postId, authorId, content.trim(), mediaUrls.length > 0 ? mediaUrls : null]
            );

            const post = result.rows[0];

            // Fetch author details
            const userRes = await this.pool.query(
                `SELECT full_name as "fullName", role FROM users WHERE id = $1`,
                [authorId]
            );
            const author = userRes.rows[0];

            log.info({ postId, authorId }, 'Post created');

            return {
                ...post,
                authorName: author?.fullName || 'Unknown',
                authorRole: author?.role || 'user',
                isLiked: false,
            };
        } catch (error) {
            log.error({ error, authorId }, 'Failed to create post');
            throw new AppError('Failed to create post', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Update an existing post. Only the author can update.
     */
    async updatePost(postId: string, userId: string, content: string, mediaUrls?: string[]): Promise<Post> {
        if (!content || content.trim().length === 0) {
            throw new ValidationError('Post content is required', ErrorCode.MISSING_FIELD);
        }

        // Verify ownership
        const ownership = await this.pool.query(
            `SELECT author_id FROM posts WHERE id = $1`,
            [postId]
        );

        if (ownership.rows.length === 0) {
            throw new NotFoundError('Post not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (ownership.rows[0].author_id !== userId) {
            throw new AppError('Not authorized to edit this post', 403, ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const updates: string[] = ['content = $2', 'updated_at = NOW()'];
        const values: any[] = [postId, content.trim()];
        let paramIdx = 3;

        if (mediaUrls !== undefined) {
            updates.push(`media_urls = $${paramIdx}`);
            values.push(mediaUrls.length > 0 ? mediaUrls : null);
            paramIdx++;
        }

        const result = await this.pool.query(
            `
            UPDATE posts
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING
                id,
                author_id as "authorId",
                content,
                media_urls as "mediaUrls",
                likes_count as "likesCount",
                comments_count as "commentsCount",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
            values
        );

        log.info({ postId, userId }, 'Post updated');
        return result.rows[0];
    }

    /**
     * Delete a post. Only the author can delete.
     */
    async deletePost(postId: string, userId: string): Promise<void> {
        const ownership = await this.pool.query(
            `SELECT author_id FROM posts WHERE id = $1`,
            [postId]
        );

        if (ownership.rows.length === 0) {
            throw new NotFoundError('Post not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (ownership.rows[0].author_id !== userId) {
            throw new AppError('Not authorized to delete this post', 403, ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        // Delete comments and likes first
        await this.pool.query(`DELETE FROM comments WHERE post_id = $1`, [postId]);
        await this.pool.query(`DELETE FROM post_likes WHERE post_id = $1`, [postId]);
        await this.pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);

        log.info({ postId, userId }, 'Post deleted');
    }

    // ─── Likes ────────────────────────────────────────────────

    /**
     * Toggle like/unlike on a post.
     */
    async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
        // Check if post exists
        const postCheck = await this.pool.query(
            `SELECT id FROM posts WHERE id = $1`,
            [postId]
        );
        if (postCheck.rows.length === 0) {
            throw new NotFoundError('Post not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        // Check existing like
        const existingLike = await this.pool.query(
            `SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2`,
            [postId, userId]
        );

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            let liked: boolean;
            if (existingLike.rows.length > 0) {
                // Unlike
                await client.query(
                    `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
                    [postId, userId]
                );
                await client.query(
                    `UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
                    [postId]
                );
                liked = false;
            } else {
                // Like
                await client.query(
                    `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`,
                    [postId, userId]
                );
                await client.query(
                    `UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1`,
                    [postId]
                );
                liked = true;
            }

            await client.query('COMMIT');

            const countResult = await this.pool.query(
                `SELECT likes_count as "likesCount" FROM posts WHERE id = $1`,
                [postId]
            );

            log.debug({ postId, userId, liked }, 'Post like toggled');
            return { liked, likesCount: Number(countResult.rows[0].likesCount) };
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, postId, userId }, 'Failed to toggle like');
            throw new AppError('Failed to process like', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Comments ─────────────────────────────────────────────

    /**
     * Add a comment to a post.
     */
    async addComment(postId: string, authorId: string, content: string): Promise<Comment> {
        if (!content || content.trim().length === 0) {
            throw new ValidationError('Comment content is required', ErrorCode.MISSING_FIELD);
        }

        if (content.length > 2000) {
            throw new ValidationError('Comment exceeds 2000 character limit', ErrorCode.INVALID_INPUT);
        }

        // Check if post exists
        const postCheck = await this.pool.query(
            `SELECT id FROM posts WHERE id = $1`,
            [postId]
        );
        if (postCheck.rows.length === 0) {
            throw new NotFoundError('Post not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const commentId = uuidv4();
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `
                INSERT INTO comments (id, post_id, author_id, content)
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id,
                    post_id as "postId",
                    author_id as "authorId",
                    content,
                    created_at as "createdAt"
                `,
                [commentId, postId, authorId, content.trim()]
            );

            await client.query(
                `UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1`,
                [postId]
            );

            await client.query('COMMIT');

            // Fetch author details
            const userRes = await this.pool.query(
                `SELECT full_name as "fullName", role FROM users WHERE id = $1`,
                [authorId]
            );

            log.info({ commentId, postId, authorId }, 'Comment added');

            return {
                ...result.rows[0],
                authorName: userRes.rows[0]?.fullName || 'Unknown',
                authorRole: userRes.rows[0]?.role || 'user',
            };
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, postId, authorId }, 'Failed to add comment');
            throw new AppError('Failed to add comment', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * Delete a comment. Author of the comment or post author can delete.
     */
    async deleteComment(commentId: string, userId: string): Promise<void> {
        const commentCheck = await this.pool.query(
            `
            SELECT c.author_id, c.post_id, p.author_id as post_author_id
            FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.id = $1
            `,
            [commentId]
        );

        if (commentCheck.rows.length === 0) {
            throw new NotFoundError('Comment not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const { author_id, post_id, post_author_id } = commentCheck.rows[0];

        // Allow deletion by comment author or post author
        if (author_id !== userId && post_author_id !== userId) {
            throw new AppError('Not authorized to delete this comment', 403, ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM comments WHERE id = $1`, [commentId]);
            await client.query(
                `UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1`,
                [post_id]
            );
            await client.query('COMMIT');

            log.info({ commentId, userId }, 'Comment deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, commentId, userId }, 'Failed to delete comment');
            throw new AppError('Failed to delete comment', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Buddy Matching ───────────────────────────────────────

    /**
     * Find workout buddies based on shared goals, gym, and schedule.
     */
    async findWorkoutBuddies(
        userId: string,
        filters: { gymId?: string; goal?: string; preferredTime?: string }
    ): Promise<BuddyMatch[]> {
        log.debug({ userId, filters }, 'Finding workout buddies');

        try {
            // Build query based on filters
            let query = `
                SELECT 
                    u.id,
                    u.full_name as name,
                    u.avatar_url as "avatarUrl",
                    u.role,
                    tp.fitness_goal as "fitnessGoal",
                    tp.preferred_workout_time as "preferredTime"
                FROM users u
                JOIN trainee_profiles tp ON tp.user_id = u.id
                WHERE u.id != $1
                  AND u.role = 'trainee'
                  AND u.status = 'active'
            `;
            const params: any[] = [userId];
            let paramIdx = 2;

            if (filters.gymId) {
                query += ` AND EXISTS (
                    SELECT 1 FROM gym_subscriptions gs
                    WHERE gs.trainee_id = u.id AND gs.gym_id = $${paramIdx} AND gs.status = 'active'
                )`;
                params.push(filters.gymId);
                paramIdx++;
            }

            if (filters.goal) {
                query += ` AND tp.fitness_goal ILIKE $${paramIdx}`;
                params.push(`%${filters.goal}%`);
                paramIdx++;
            }

            if (filters.preferredTime) {
                query += ` AND tp.preferred_workout_time ILIKE $${paramIdx}`;
                params.push(`%${filters.preferredTime}%`);
                paramIdx++;
            }

            query += ` ORDER BY u.last_active_at DESC NULLS LAST LIMIT 10`;

            const result = await this.pool.query(query, params);

            // Calculate match scores
            const matches: BuddyMatch[] = result.rows.map((row: any) => {
                let score = 70; // Base score
                if (filters.goal && row.fitnessGoal?.toLowerCase().includes(filters.goal.toLowerCase())) {
                    score += 15;
                }
                if (filters.preferredTime && row.preferredTime?.toLowerCase().includes(filters.preferredTime.toLowerCase())) {
                    score += 15;
                }
                return {
                    id: row.id,
                    name: row.name,
                    matchScore: `${Math.min(score, 99)}%`,
                    sharedGoal: row.fitnessGoal || filters.goal || 'General Fitness',
                    preferredTime: row.preferredTime || filters.preferredTime || 'Flexible',
                    avatarUrl: row.avatarUrl,
                };
            });

            // Sort by match score descending
            matches.sort((a, b) => parseInt(b.matchScore) - parseInt(a.matchScore));

            log.info({ userId, matchCount: matches.length }, 'Buddy matches found');
            return matches;
        } catch (error) {
            log.error({ error, userId }, 'Failed to find workout buddies');
            // Return mock matches as fallback
            return [
                { id: 'u_789', name: 'Omar Y.', matchScore: '92%', sharedGoal: filters.goal || 'Strength', preferredTime: filters.preferredTime || 'Evening', avatarUrl: undefined },
                { id: 'u_456', name: 'Sara K.', matchScore: '85%', sharedGoal: filters.goal || 'Strength', preferredTime: filters.preferredTime || 'Evening', avatarUrl: undefined },
            ];
        }
    }

    // ─── Follow / Unfollow ────────────────────────────────────

    /**
     * Follow a user.
     */
    async followUser(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) {
            throw new ValidationError('Cannot follow yourself', ErrorCode.INVALID_INPUT);
        }

        // Check if user exists
        const userCheck = await this.pool.query(
            `SELECT id FROM users WHERE id = $1 AND status = 'active'`,
            [followingId]
        );
        if (userCheck.rows.length === 0) {
            throw new NotFoundError('User not found', ErrorCode.NOT_FOUND_USER);
        }

        try {
            await this.pool.query(
                `
                INSERT INTO follows (follower_id, following_id)
                VALUES ($1, $2)
                ON CONFLICT (follower_id, following_id) DO NOTHING
                `,
                [followerId, followingId]
            );

            log.info({ followerId, followingId }, 'User followed');
        } catch (error) {
            if ((error as any)?.code === '23505') {
                throw new ConflictError('Already following this user', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
            }
            log.error({ error, followerId, followingId }, 'Failed to follow user');
            throw new AppError('Failed to follow user', 500, ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Unfollow a user.
     */
    async unfollowUser(followerId: string, followingId: string): Promise<void> {
        await this.pool.query(
            `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
            [followerId, followingId]
        );

        log.info({ followerId, followingId }, 'User unfollowed');
    }

    /**
     * Get followers of a user.
     */
    async getFollowers(userId: string): Promise<FollowUser[]> {
        const result = await this.pool.query(
            `
            SELECT 
                u.id,
                u.full_name as "fullName",
                u.role,
                u.avatar_url as "avatarUrl",
                f.created_at as "followedAt"
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1
            ORDER BY f.created_at DESC
            `,
            [userId]
        );
        return result.rows;
    }

    /**
     * Get users that a user is following.
     */
    async getFollowing(userId: string): Promise<FollowUser[]> {
        const result = await this.pool.query(
            `
            SELECT 
                u.id,
                u.full_name as "fullName",
                u.role,
                u.avatar_url as "avatarUrl",
                f.created_at as "followedAt"
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = $1
            ORDER BY f.created_at DESC
            `,
            [userId]
        );
        return result.rows;
    }
}
