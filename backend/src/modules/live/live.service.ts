/**
 * GEM Z — Live Streaming Service
 *
 * Handles streaming logic:
 *   - Start/stop streams
 *   - Track active streams
 *   - Chat messages
 *   - Viewer count tracking
 *
 * In production, this integrates with a streaming provider (Agora, Twilio, etc.)
 * For now, it manages stream state in Redis + PostgreSQL.
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('live');

// ─── Types ──────────────────────────────────────────────────────

export type StreamStatus = 'live' | 'ended' | 'scheduled';

export interface Stream {
    id: string;
    hostId: string;
    hostName: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    status: StreamStatus;
    viewerCount: number;
    startedAt: Date;
    endedAt: Date | null;
    streamUrl: string | null;
    roomToken: string;
    tags: string[] | null;
    createdAt: Date;
}

export interface ChatMessage {
    id: string;
    streamId: string;
    userId: string;
    userName: string;
    message: string;
    sentAt: Date;
}

export interface StreamInput {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    tags?: string[];
}

// ─── Constants ──────────────────────────────────────────────────

const STREAM_CACHE_TTL = 3600; // 1 hour
const CHAT_HISTORY_LIMIT = 100;
const MAX_STREAM_DURATION_HOURS = 4;

// ─── Stream Management ──────────────────────────────────────────

/**
 * Start a new live stream.
 */
export async function startStream(
    hostId: string,
    hostName: string,
    input: StreamInput
): Promise<Stream> {
    if (!input.title || input.title.trim().length === 0) {
        throw new ValidationError('Stream title is required', ErrorCode.MISSING_FIELD);
    }

    // Check if user already has an active stream
    const existing = await db.query(
        `SELECT id FROM live_streams WHERE host_id = $1 AND status = 'live'`,
        [hostId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
        throw new ConflictError('You already have an active stream', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
    }

    const roomToken = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const streamUrl = `${process.env.STREAM_BASE_URL || 'https://stream.gemz.app'}/live/${roomToken}`;

    const { rows } = await db.query(
        `
        INSERT INTO live_streams (host_id, title, description, thumbnail_url, status, stream_url, room_token, tags)
        VALUES ($1, $2, $3, $4, 'live', $5, $6, $7)
        RETURNING id, host_id as "hostId", title, description, thumbnail_url as "thumbnailUrl",
                  status, stream_url as "streamUrl", room_token as "roomToken",
                  tags, started_at as "startedAt", ended_at as "endedAt",
                  created_at as "createdAt"
        `,
        [
            hostId,
            input.title.trim(),
            input.description || null,
            input.thumbnailUrl || null,
            streamUrl,
            roomToken,
            input.tags || null,
        ]
    );

    const row = rows[0];

    // Cache active stream in Redis
    await redisClient.setex(
        `gemz:stream:${row.id}`,
        STREAM_CACHE_TTL,
        JSON.stringify({
            id: row.id,
            hostId,
            hostName,
            title: input.title,
            status: 'live',
            viewerCount: 0,
            startedAt: row.startedAt,
        })
    );

    // Add to active streams set
    await redisClient.sadd('gemz:active_streams', row.id);

    log.info({ streamId: row.id, hostId }, 'Stream started');
    logAudit('stream_started', { userId: hostId, resource: row.id, result: 'success' });

    return {
        id: String(row.id),
        hostId: String(row.hostId),
        hostName,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        status: row.status,
        viewerCount: 0,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt ? new Date(row.endedAt) : null,
        streamUrl: row.streamUrl,
        roomToken: row.roomToken,
        tags: row.tags || null,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Stop a live stream.
 */
export async function stopStream(hostId: string, streamId: string): Promise<Stream> {
    const { rows } = await db.query(
        `
        UPDATE live_streams
        SET status = 'ended',
            ended_at = NOW()
        WHERE id = $1 AND host_id = $2 AND status = 'live'
        RETURNING id, host_id as "hostId", title, description,
                  thumbnail_url as "thumbnailUrl", status,
                  stream_url as "streamUrl", room_token as "roomToken",
                  tags, started_at as "startedAt", ended_at as "endedAt",
                  created_at as "createdAt"
        `,
        [streamId, hostId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Active stream not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = rows[0];

    // Remove from active streams
    await redisClient.srem('gemz:active_streams', streamId);
    await redisClient.del(`gemz:stream:${streamId}`);
    await redisClient.del(`gemz:stream:viewers:${streamId}`);

    log.info({ streamId, hostId }, 'Stream stopped');
    logAudit('stream_stopped', { userId: hostId, resource: streamId, result: 'success' });

    return {
        id: String(row.id),
        hostId: String(row.hostId),
        hostName: '',
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        status: row.status,
        viewerCount: 0,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt ? new Date(row.endedAt) : null,
        streamUrl: row.streamUrl,
        roomToken: row.roomToken,
        tags: row.tags || null,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Get all currently active streams.
 */
export async function getActiveStreams(): Promise<Stream[]> {
    // Get from database for reliability
    const { rows } = await db.query(
        `
        SELECT s.id, s.host_id as "hostId", s.title, s.description,
               s.thumbnail_url as "thumbnailUrl", s.status,
               s.stream_url as "streamUrl", s.room_token as "roomToken",
               s.tags, s.started_at as "startedAt", s.created_at as "createdAt",
               u.full_name as "hostName"
        FROM live_streams s
        JOIN users u ON s.host_id = u.id
        WHERE s.status = 'live'
        ORDER BY s.started_at DESC
        `
    );

    const streams: Stream[] = [];
    for (const row of rows) {
        // Get viewer count from Redis
        const viewerCountStr = await redisClient.get(`gemz:stream:viewers:${row.id}`);
        const viewerCount = viewerCountStr ? parseInt(viewerCountStr) || 0 : 0;

        streams.push({
            id: String(row.id),
            hostId: String(row.hostId),
            hostName: row.hostName || 'Unknown',
            title: row.title,
            description: row.description,
            thumbnailUrl: row.thumbnailUrl,
            status: row.status,
            viewerCount,
            startedAt: new Date(row.startedAt),
            endedAt: null,
            streamUrl: row.streamUrl,
            roomToken: row.roomToken,
            tags: row.tags || null,
            createdAt: new Date(row.createdAt),
        });
    }

    return streams;
}

/**
 * Get stream details by ID.
 */
export async function getStream(streamId: string): Promise<Stream> {
    const { rows } = await db.query(
        `
        SELECT s.id, s.host_id as "hostId", s.title, s.description,
               s.thumbnail_url as "thumbnailUrl", s.status,
               s.stream_url as "streamUrl", s.room_token as "roomToken",
               s.tags, s.started_at as "startedAt", s.ended_at as "endedAt",
               s.created_at as "createdAt",
               u.full_name as "hostName"
        FROM live_streams s
        JOIN users u ON s.host_id = u.id
        WHERE s.id = $1
        `,
        [streamId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Stream not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = rows[0];

    // Get viewer count from Redis
    const viewerCountStr = await redisClient.get(`gemz:stream:viewers:${streamId}`);
    const viewerCount = viewerCountStr ? parseInt(viewerCountStr) || 0 : 0;

    return {
        id: String(row.id),
        hostId: String(row.hostId),
        hostName: row.hostName || 'Unknown',
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        status: row.status,
        viewerCount,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt ? new Date(row.endedAt) : null,
        streamUrl: row.streamUrl,
        roomToken: row.roomToken,
        tags: row.tags || null,
        createdAt: new Date(row.createdAt),
    };
}

// ─── Chat ───────────────────────────────────────────────────────

/**
 * Send a chat message in a stream.
 */
export async function sendChatMessage(
    streamId: string,
    userId: string,
    userName: string,
    message: string
): Promise<ChatMessage> {
    if (!message || message.trim().length === 0) {
        throw new ValidationError('Message cannot be empty', ErrorCode.MISSING_FIELD);
    }

    if (message.length > 500) {
        throw new ValidationError('Message must not exceed 500 characters', ErrorCode.INVALID_INPUT);
    }

    // Verify stream exists and is live
    const streamRes = await db.query(
        `SELECT id, status FROM live_streams WHERE id = $1`,
        [streamId]
    );
    if (streamRes.rowCount === 0 || !streamRes.rowCount) {
        throw new NotFoundError('Stream not found', ErrorCode.NOT_FOUND_RESOURCE);
    }
    if (streamRes.rows[0].status !== 'live') {
        throw new ValidationError('Stream is not live', ErrorCode.INVALID_INPUT);
    }

    const { rows } = await db.query(
        `
        INSERT INTO stream_chat_messages (stream_id, user_id, user_name, message)
        VALUES ($1, $2, $3, $4)
        RETURNING id, stream_id as "streamId", user_id as "userId",
                  user_name as "userName", message, sent_at as "sentAt"
        `,
        [streamId, userId, userName, message.trim()]
    );

    const row = rows[0];

    // Also store recent messages in Redis for fast retrieval
    const chatKey = `gemz:stream:chat:${streamId}`;
    await redisClient.lpush(chatKey, JSON.stringify({
        id: row.id,
        userId,
        userName,
        message: message.trim(),
        sentAt: row.sentAt,
    }));
    await redisClient.ltrim(chatKey, 0, CHAT_HISTORY_LIMIT - 1);
    await redisClient.expire(chatKey, STREAM_CACHE_TTL);

    return {
        id: String(row.id),
        streamId: String(row.streamId),
        userId: String(row.userId),
        userName: row.userName,
        message: row.message,
        sentAt: new Date(row.sentAt),
    };
}

/**
 * Get chat messages for a stream.
 */
export async function getChatMessages(
    streamId: string,
    limit: number = 50
): Promise<ChatMessage[]> {
    // Try Redis first for recent messages
    const chatKey = `gemz:stream:chat:${streamId}`;
    const cachedMessages = await redisClient.lrange(chatKey, 0, limit - 1);

    if (cachedMessages && cachedMessages.length > 0) {
        return cachedMessages.map((msg) => {
            const parsed = JSON.parse(msg);
            return {
                id: String(parsed.id),
                streamId,
                userId: String(parsed.userId),
                userName: parsed.userName,
                message: parsed.message,
                sentAt: new Date(parsed.sentAt),
            };
        }).reverse();
    }

    // Fallback to database
    const { rows } = await db.query(
        `
        SELECT id, stream_id as "streamId", user_id as "userId",
               user_name as "userName", message, sent_at as "sentAt"
        FROM stream_chat_messages
        WHERE stream_id = $1
        ORDER BY sent_at DESC
        LIMIT $2
        `,
        [streamId, limit]
    );

    return rows.map((row) => ({
        id: String(row.id),
        streamId: String(row.streamId),
        userId: String(row.userId),
        userName: row.userName,
        message: row.message,
        sentAt: new Date(row.sentAt),
    }));
}

// ─── Viewer Count ───────────────────────────────────────────────

/**
 * Increment viewer count for a stream.
 */
export async function incrementViewerCount(streamId: string): Promise<number> {
    const count = await redisClient.incr(`gemz:stream:viewers:${streamId}`);
    await redisClient.expire(`gemz:stream:viewers:${streamId}`, STREAM_CACHE_TTL);
    return count;
}

/**
 * Decrement viewer count for a stream.
 */
export async function decrementViewerCount(streamId: string): Promise<number> {
    const current = await redisClient.get(`gemz:stream:viewers:${streamId}`);
    const currentNum = current ? parseInt(current) || 0 : 0;
    if (currentNum <= 0) return 0;

    const count = await redisClient.decr(`gemz:stream:viewers:${streamId}`);
    return Math.max(count, 0);
}
