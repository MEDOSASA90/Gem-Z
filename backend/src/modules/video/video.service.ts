/**
 * GEM Z — Video Tutorial Service
 *
 * Video management with upload, transcoding, and streaming support.
 * Features:
 *   - Upload videos with metadata
 *   - Categorize videos (workout, nutrition, technique, etc.)
 *   - Search videos by title, description, tags
 *   - Track view counts and engagement
 *   - Video streaming with range support
 *   - Transcoding status tracking
 */

import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';
import { redisClient } from '../../core/redis/client';
import path from 'path';
import fs from 'fs/promises';

const log = createLogger('video');

// ─── Types ──────────────────────────────────────────────────────

export interface VideoTutorial {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number; // seconds
    category: VideoCategory;
    tags: string[];
    trainerId?: string;
    trainerName?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    viewCount: number;
    likeCount: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type VideoCategory =
    | 'workout'
    | 'nutrition'
    | 'technique'
    | 'stretching'
    | 'motivation'
    | 'education'
    | 'yoga'
    | 'cardio'
    | 'strength'
    | 'hiit';

export interface CreateVideoInput {
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    category: VideoCategory;
    tags?: string[];
    trainerId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
}

export interface UpdateVideoInput {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    duration?: number;
    category?: VideoCategory;
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    isPublished?: boolean;
}

export interface VideoSearchOptions {
    query?: string;
    category?: VideoCategory;
    difficulty?: string;
    trainerId?: string;
    tags?: string[];
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'duration';
}

export interface PaginatedVideos {
    videos: VideoTutorial[];
    total: number;
    page: number;
    totalPages: number;
    categories: { name: string; count: number }[];
}

export interface TranscodingJob {
    id: string;
    videoId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    resolution?: string;
    progress?: number;
    errorMessage?: string;
    createdAt: Date;
    completedAt?: Date;
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Create a new video tutorial.
 *
 * @param input - Video creation data
 * @returns The created video
 */
export async function createVideo(input: CreateVideoInput): Promise<VideoTutorial> {
    if (!input.title || input.title.trim().length === 0) {
        throw new ValidationError('Video title is required', ErrorCode.INVALID_INPUT);
    }

    if (!input.videoUrl || input.videoUrl.trim().length === 0) {
        throw new ValidationError('Video URL is required', ErrorCode.INVALID_INPUT);
    }

    if (!input.category) {
        throw new ValidationError('Category is required', ErrorCode.INVALID_INPUT);
    }

    const videoId = generateVideoId();

    try {
        const result = await db.query(
            `INSERT INTO video_tutorials
                (id, title, description, video_url, thumbnail_url, duration, category, tags, trainer_id, difficulty, language, is_published, view_count, like_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0)
             RETURNING *`,
            [
                videoId,
                input.title.trim(),
                input.description?.trim() || null,
                input.videoUrl.trim(),
                input.thumbnailUrl || null,
                input.duration || null,
                input.category,
                input.tags || [],
                input.trainerId || null,
                input.difficulty || 'beginner',
                input.language || 'en',
                true,
            ]
        );

        const row = result.rows[0];
        const video = mapVideoRow(row);

        log.info({ videoId, title: input.title, category: input.category }, 'Video tutorial created');
        return video;
    } catch (error) {
        log.error({ error: (error as Error).message, title: input.title }, 'Failed to create video');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to create video tutorial', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Update a video tutorial.
 *
 * @param videoId - Video ID
 * @param input - Update data
 * @returns Updated video
 */
export async function updateVideo(
    videoId: string,
    input: UpdateVideoInput
): Promise<VideoTutorial> {
    const existing = await getVideoById(videoId);
    if (!existing) {
        throw new NotFoundError('Video not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(input.title.trim());
    }
    if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description?.trim() || null);
    }
    if (input.thumbnailUrl !== undefined) {
        updates.push(`thumbnail_url = $${paramIndex++}`);
        values.push(input.thumbnailUrl || null);
    }
    if (input.duration !== undefined) {
        updates.push(`duration = $${paramIndex++}`);
        values.push(input.duration);
    }
    if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(input.category);
    }
    if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(input.tags);
    }
    if (input.difficulty !== undefined) {
        updates.push(`difficulty = $${paramIndex++}`);
        values.push(input.difficulty);
    }
    if (input.language !== undefined) {
        updates.push(`language = $${paramIndex++}`);
        values.push(input.language);
    }
    if (input.isPublished !== undefined) {
        updates.push(`is_published = $${paramIndex++}`);
        values.push(input.isPublished);
    }

    if (updates.length === 0) {
        return existing;
    }

    updates.push(`updated_at = NOW()`);
    values.push(videoId);

    try {
        const result = await db.query(
            `UPDATE video_tutorials SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        log.info({ videoId, updatedFields: Object.keys(input) }, 'Video tutorial updated');
        return mapVideoRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, videoId }, 'Failed to update video');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to update video', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get a video by ID and increment view count.
 *
 * @param videoId - Video ID
 * @param userId - Optional user ID for tracking
 * @returns Video or null
 */
export async function getVideoById(videoId: string, userId?: string): Promise<VideoTutorial | null> {
    try {
        const result = await db.query(
            `SELECT v.*, u.full_name as trainer_name
             FROM video_tutorials v
             LEFT JOIN users u ON v.trainer_id = u.id
             WHERE v.id = $1 AND v.is_published = TRUE`,
            [videoId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        // Increment view count asynchronously
        await incrementViewCount(videoId, userId);

        return mapVideoRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, videoId }, 'Failed to get video');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to retrieve video', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Search and list videos with filters.
 *
 * @param options - Search and filter options
 * @returns Paginated videos
 */
export async function searchVideos(options: VideoSearchOptions = {}): Promise<PaginatedVideos> {
    const {
        query,
        category,
        difficulty,
        trainerId,
        tags,
        page = 1,
        limit = 20,
        sortBy = 'newest',
    } = options;

    const conditions: string[] = ['is_published = TRUE'];
    const values: any[] = [];
    let paramIndex = 1;

    if (query) {
        conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR $${paramIndex} = ANY(tags))`);
        values.push(`%${query}%`);
        paramIndex++;
    }

    if (category) {
        conditions.push(`category = $${paramIndex++}`);
        values.push(category);
    }

    if (difficulty) {
        conditions.push(`difficulty = $${paramIndex++}`);
        values.push(difficulty);
    }

    if (trainerId) {
        conditions.push(`trainer_id = $${paramIndex++}`);
        values.push(trainerId);
    }

    if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        values.push(tags);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const orderBy = {
        newest: 'created_at DESC',
        popular: 'view_count DESC',
        duration: 'duration DESC NULLS LAST',
    }[sortBy] || 'created_at DESC';

    try {
        const [videosResult, countResult, categoriesResult] = await Promise.all([
            db.query(
                `SELECT v.*, u.full_name as trainer_name
                 FROM video_tutorials v
                 LEFT JOIN users u ON v.trainer_id = u.id
                 WHERE ${whereClause}
                 ORDER BY ${orderBy}
                 LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) as total FROM video_tutorials WHERE ${whereClause}`,
                [...values]
            ),
            db.query(
                `SELECT category as name, COUNT(*) as count
                 FROM video_tutorials
                 WHERE is_published = TRUE
                 GROUP BY category
                 ORDER BY count DESC`
            ),
        ]);

        const total = Number(countResult.rows[0].total);

        return {
            videos: videosResult.rows.map(mapVideoRow),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            categories: categoriesResult.rows.map((r) => ({ name: r.name, count: Number(r.count) })),
        };
    } catch (error) {
        log.error({ error: (error as Error).message, query, category }, 'Failed to search videos');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to search videos', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get videos by category.
 *
 * @param category - Video category
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated videos
 */
export async function getVideosByCategory(
    category: VideoCategory,
    page: number = 1,
    limit: number = 20
): Promise<PaginatedVideos> {
    return searchVideos({ category, page, limit });
}

/**
 * Delete a video tutorial.
 *
 * @param videoId - Video ID
 */
export async function deleteVideo(videoId: string): Promise<void> {
    const existing = await getVideoById(videoId);
    if (!existing) {
        throw new NotFoundError('Video not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    try {
        await db.query(`DELETE FROM video_tutorials WHERE id = $1`, [videoId]);
        await redisClient.del(`video:${videoId}`);

        log.info({ videoId }, 'Video tutorial deleted');
    } catch (error) {
        log.error({ error: (error as Error).message, videoId }, 'Failed to delete video');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to delete video', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Toggle like on a video.
 *
 * @param videoId - Video ID
 * @param userId - User ID
 * @returns New like count and whether user liked
 */
export async function toggleLike(videoId: string, userId: string): Promise<{ likeCount: number; liked: boolean }> {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Check if already liked
        const existingResult = await client.query(
            `SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2`,
            [videoId, userId]
        );

        let liked: boolean;

        if (existingResult.rowCount && existingResult.rowCount > 0) {
            // Unlike
            await client.query(`DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2`, [videoId, userId]);
            await client.query(`UPDATE video_tutorials SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [videoId]);
            liked = false;
        } else {
            // Like
            await client.query(
                `INSERT INTO video_likes (video_id, user_id) VALUES ($1, $2)`,
                [videoId, userId]
            );
            await client.query(`UPDATE video_tutorials SET like_count = like_count + 1 WHERE id = $1`, [videoId]);
            liked = true;
        }

        const countResult = await client.query(
            `SELECT like_count FROM video_tutorials WHERE id = $1`,
            [videoId]
        );

        await client.query('COMMIT');

        const likeCount = Number(countResult.rows[0].like_count);

        log.info({ videoId, userId, liked, likeCount }, 'Video like toggled');
        return { likeCount, liked };
    } catch (error) {
        await client.query('ROLLBACK');
        log.error({ error: (error as Error).message, videoId, userId }, 'Failed to toggle like');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to toggle like', ErrorCode.SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Check if user liked a video.
 */
export async function checkUserLike(videoId: string, userId: string): Promise<boolean> {
    const result = await db.query(
        `SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2`,
        [videoId, userId]
    );
    return (result.rowCount || 0) > 0;
}

// ─── Transcoding ────────────────────────────────────────────────

/**
 * Create a transcoding job for a video.
 *
 * @param videoId - Video ID
 * @param resolution - Target resolution
 * @returns Transcoding job
 */
export async function createTranscodingJob(
    videoId: string,
    resolution: string = '720p'
): Promise<TranscodingJob> {
    const jobId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        const result = await db.query(
            `INSERT INTO video_transcoding_jobs (id, video_id, status, resolution, progress)
             VALUES ($1, $2, 'pending', $3, 0)
             RETURNING *`,
            [jobId, videoId, resolution]
        );

        return mapTranscodingRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, videoId }, 'Failed to create transcoding job');
        throw new ServerError('Failed to create transcoding job', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Update transcoding job progress.
 *
 * @param jobId - Job ID
 * @param progress - Progress percentage (0-100)
 * @param status - Job status
 */
export async function updateTranscodingJob(
    jobId: string,
    progress?: number,
    status?: TranscodingJob['status'],
    errorMessage?: string
): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (progress !== undefined) {
        updates.push(`progress = $${paramIndex++}`);
        values.push(progress);
    }
    if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
    }
    if (errorMessage) {
        updates.push(`error_message = $${paramIndex++}`);
        values.push(errorMessage);
    }

    if (status === 'completed' || status === 'failed') {
        updates.push(`completed_at = NOW()`);
    }

    updates.push(`updated_at = NOW()`);
    values.push(jobId);

    await db.query(
        `UPDATE video_transcoding_jobs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
    );
}

/**
 * Get transcoding job status.
 */
export async function getTranscodingJob(jobId: string): Promise<TranscodingJob | null> {
    const result = await db.query(
        `SELECT * FROM video_transcoding_jobs WHERE id = $1`,
        [jobId]
    );

    if (result.rowCount === 0) return null;
    return mapTranscodingRow(result.rows[0]);
}

// ─── Private Helpers ────────────────────────────────────────────

async function incrementViewCount(videoId: string, userId?: string): Promise<void> {
    try {
        // Check cache to prevent duplicate views from same user within 1 hour
        if (userId) {
            const cacheKey = `video:view:${videoId}:${userId}`;
            const cached = await redisClient.get(cacheKey);
            if (cached) return;
            await redisClient.setex(cacheKey, 3600, '1');
        }

        await db.query(
            `UPDATE video_tutorials SET view_count = view_count + 1 WHERE id = $1`,
            [videoId]
        );
    } catch (error) {
        log.warn({ error: (error as Error).message, videoId }, 'Failed to increment view count');
    }
}

function mapVideoRow(row: any): VideoTutorial {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        category: row.category,
        tags: row.tags || [],
        trainerId: row.trainer_id,
        trainerName: row.trainer_name,
        difficulty: row.difficulty,
        language: row.language,
        viewCount: Number(row.view_count),
        likeCount: Number(row.like_count),
        isPublished: row.is_published,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTranscodingRow(row: any): TranscodingJob {
    return {
        id: row.id,
        videoId: row.video_id,
        status: row.status,
        resolution: row.resolution,
        progress: Number(row.progress),
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
    };
}

function generateVideoId(): string {
    return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Popular / Trending ─────────────────────────────────────────

/**
 * Get trending/popular videos.
 */
export async function getTrendingVideos(limit: number = 10): Promise<VideoTutorial[]> {
    try {
        const result = await db.query(
            `SELECT v.*, u.full_name as trainer_name
             FROM video_tutorials v
             LEFT JOIN users u ON v.trainer_id = u.id
             WHERE v.is_published = TRUE
             ORDER BY v.view_count DESC, v.like_count DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows.map(mapVideoRow);
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to get trending videos');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to get trending videos', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get recently added videos.
 */
export async function getRecentVideos(limit: number = 10): Promise<VideoTutorial[]> {
    try {
        const result = await db.query(
            `SELECT v.*, u.full_name as trainer_name
             FROM video_tutorials v
             LEFT JOIN users u ON v.trainer_id = u.id
             WHERE v.is_published = TRUE
             ORDER BY v.created_at DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows.map(mapVideoRow);
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to get recent videos');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to get recent videos', ErrorCode.SERVER_ERROR);
    }
}
