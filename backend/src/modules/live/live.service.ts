/**
 * GEM Z — Live Streaming Service
 *
 * Manages live stream lifecycle using WebRTC and database persistence:
 *   - Start / stop streams
 *   - Manage viewer counts
 *   - Chat messaging
 *   - Active stream listing
 *
 * Architecture:
 *   - WebRTC for peer-to-peer streaming
 *   - Redis for real-time viewer counts and presence
 *   - PostgreSQL for stream persistence and chat history
 *   - Socket.io events for real-time updates
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('live');

// ─── Types ──────────────────────────────────────────────────────

export type StreamStatus = 'live' | 'ended' | 'scheduled';

export interface LiveStream {
    id: string;
    hostId: string;
    hostName: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    status: StreamStatus;
    tags: string[];
    viewerCount: number;
    maxViewerCount: number;
    startedAt: Date;
    endedAt: Date | null;
    createdAt: Date;
}

export interface StreamInput {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    tags?: string[];
}

export interface ChatMessage {
    id: string;
    streamId: string;
    userId: string;
    userName: string;
    message: string;
    createdAt: Date;
}

export interface WebRTCSignal {
    type: 'offer' | 'answer' | 'ice-candidate';
    streamId: string;
    payload: any;
    fromUserId: string;
    toUserId?: string;
}

// ─── Stream Management ──────────────────────────────────────────

/**
 * Start a new live stream.
 */
export async function startStream(
    hostId: string,
    hostName: string,
    input: StreamInput
): Promise<LiveStream> {
    // Check if user already has an active stream
    const existingStream = await getActiveStreamByHost(hostId);
    if (existingStream) {
        throw new ConflictError(
            'You already have an active stream. End it before starting a new one.',
            ErrorCode.CONFLICT_DUPLICATE_RESOURCE
        );
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `
            INSERT INTO live_streams (
                host_id, host_name, title, description, thumbnail_url,
                status, tags, viewer_count, max_viewer_count, started_at
            )
            VALUES ($1, $2, $3, $4, $5, 'live', $6, 0, 0, NOW())
            RETURNING id, host_id as "hostId", host_name as "hostName",
                      title, description, thumbnail_url as "thumbnailUrl",
                      status, tags, viewer_count as "viewerCount",
                      max_viewer_count as "maxViewerCount",
                      started_at as "startedAt", ended_at as "endedAt",
                      created_at as "createdAt"
            `,
            [
                hostId,
                hostName,
                input.title,
                input.description || null,
                input.thumbnailUrl || null,
                input.tags || [],
            ]
        );

        await client.query('COMMIT');

        const stream: LiveStream = {
            id: String(rows[0].id),
            hostId: String(rows[0].hostId),
            hostName: rows[0].hostName,
            title: rows[0].title,
            description: rows[0].description,
            thumbnailUrl: rows[0].thumbnailUrl,
            status: rows[0].status,
            tags: rows[0].tags,
            viewerCount: 0,
            maxViewerCount: 0,
            startedAt: new Date(rows[0].startedAt),
            endedAt: rows[0].endedAt,
            createdAt: new Date(rows[0].createdAt),
        };

        // Cache active stream in Redis for fast lookup
        await redisClient.setEx(
            `live:active:${stream.id}`,
            3600,
            JSON.stringify({ hostId, startedAt: stream.startedAt.toISOString() })
        );
        await redisClient.sAdd('live:active_set', stream.id);

        // Set viewer count in Redis
        await redisClient.setEx(`live:viewers:${stream.id}`, 3600, '0');

        log.info({ streamId: stream.id, hostId }, 'Stream started');
        logAudit('stream_started', { userId: hostId, resource: stream.id, result: 'success' });

        return stream;
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        log.error({ error: (error as Error).message, hostId }, 'Failed to start stream');
        throw new AppError('Failed to start stream', 500, ErrorCode.SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Stop an active stream.
 */
export async function stopStream(hostId: string, streamId: string): Promise<LiveStream> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Verify the stream belongs to the host and is live
        const checkResult = await client.query(
            `SELECT host_id, status FROM live_streams WHERE id = $1`,
            [streamId]
        );

        if (checkResult.rows.length === 0) {
            throw new NotFoundError('Stream not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        if (String(checkResult.rows[0].host_id) !== hostId) {
            throw new ForbiddenError('Only the host can end this stream', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        if (checkResult.rows[0].status !== 'live') {
            throw new ValidationError('Stream is already ended', ErrorCode.INVALID_INPUT);
        }

        // Get final viewer count from Redis
        const viewerCountStr = await redisClient.get(`live:viewers:${streamId}`);
        const finalViewerCount = parseInt(viewerCountStr || '0');

        const { rows } = await client.query(
            `
            UPDATE live_streams
            SET status = 'ended',
                ended_at = NOW(),
                max_viewer_count = GREATEST(max_viewer_count, $2)
            WHERE id = $1
            RETURNING id, host_id as "hostId", host_name as "hostName",
                      title, description, thumbnail_url as "thumbnailUrl",
                      status, tags, viewer_count as "viewerCount",
                      max_viewer_count as "maxViewerCount",
                      started_at as "startedAt", ended_at as "endedAt",
                      created_at as "createdAt"
            `,
            [streamId, finalViewerCount]
        );

        await client.query('COMMIT');

        // Clean up Redis
        await redisClient.del(`live:active:${streamId}`);
        await redisClient.del(`live:viewers:${streamId}`);
        await redisClient.sRem('live:active_set', streamId);

        const stream: LiveStream = {
            id: String(rows[0].id),
            hostId: String(rows[0].hostId),
            hostName: rows[0].hostName,
            title: rows[0].title,
            description: rows[0].description,
            thumbnailUrl: rows[0].thumbnailUrl,
            status: rows[0].status,
            tags: rows[0].tags,
            viewerCount: rows[0].viewerCount,
            maxViewerCount: rows[0].maxViewerCount,
            startedAt: new Date(rows[0].startedAt),
            endedAt: rows[0].endedAt ? new Date(rows[0].endedAt) : null,
            createdAt: new Date(rows[0].createdAt),
        };

        log.info({ streamId, hostId, duration: Date.now() - stream.startedAt.getTime() }, 'Stream stopped');
        logAudit('stream_stopped', { userId: hostId, resource: streamId, result: 'success' });

        return stream;
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        log.error({ error: (error as Error).message, hostId, streamId }, 'Failed to stop stream');
        throw new AppError('Failed to stop stream', 500, ErrorCode.SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Get an active stream by its host.
 */
async function getActiveStreamByHost(hostId: string): Promise<LiveStream | null> {
    const { rows } = await db.query(
        `
        SELECT id, host_id as "hostId", host_name as "hostName",
               title, description, thumbnail_url as "thumbnailUrl",
               status, tags, viewer_count as "viewerCount",
               max_viewer_count as "maxViewerCount",
               started_at as "startedAt", ended_at as "endedAt",
               created_at as "createdAt"
        FROM live_streams
        WHERE host_id = $1 AND status = 'live'
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [hostId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        id: String(row.id),
        hostId: String(row.hostId),
        hostName: row.hostName,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        status: row.status,
        tags: row.tags,
        viewerCount: row.viewerCount,
        maxViewerCount: row.maxViewerCount,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Get a stream by ID.
 */
export async function getStream(streamId: string): Promise<LiveStream> {
    const { rows } = await db.query(
        `
        SELECT id, host_id as "hostId", host_name as "hostName",
               title, description, thumbnail_url as "thumbnailUrl",
               status, tags, viewer_count as "viewerCount",
               max_viewer_count as "maxViewerCount",
               started_at as "startedAt", ended_at as "endedAt",
               created_at as "createdAt"
        FROM live_streams
        WHERE id = $1
        `,
        [streamId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Stream not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = rows[0];
    return {
        id: String(row.id),
        hostId: String(row.hostId),
        hostName: row.hostName,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        status: row.status,
        tags: row.tags,
        viewerCount: row.viewerCount,
        maxViewerCount: row.maxViewerCount,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt,
        createdAt: new Date(row.createdAt),
    };
}

/**
 * Get all currently active (live) streams.
 */
export async function getActiveStreams(): Promise<LiveStream[]> {
    const { rows } = await db.query(
        `
        SELECT id, host_id as "hostId", host_name as "hostName",
               title, description, thumbnail_url as "thumbnailUrl",
               status, tags, viewer_count as "viewerCount",
               max_viewer_count as "maxViewerCount",
               started_at as "startedAt", ended_at as "endedAt",
               created_at as "createdAt"
        FROM live_streams
        WHERE status = 'live'
        ORDER BY started_at DESC
        `
    );

    const streams: LiveStream[] = [];
    for (const row of rows) {
        // Get real-time viewer count from Redis
        const viewerCountStr = await redisClient.get(`live:viewers:${row.id}`);
        const viewerCount = parseInt(viewerCountStr || '0');

        streams.push({
            id: String(row.id),
            hostId: String(row.hostId),
            hostName: row.hostName,
            title: row.title,
            description: row.description,
            thumbnailUrl: row.thumbnailUrl,
            status: row.status,
            tags: row.tags,
            viewerCount,
            maxViewerCount: row.maxViewerCount,
            startedAt: new Date(row.startedAt),
            endedAt: row.endedAt,
            createdAt: new Date(row.createdAt),
        });
    }

    return streams;
}

// ─── Viewer Management ──────────────────────────────────────────

/**
 * Increment viewer count for a stream.
 */
export async function incrementViewerCount(streamId: string): Promise<number> {
    const key = `live:viewers:${streamId}`;
    const count = await redisClient.incr(key);
    await redisClient.expire(key, 3600);

    // Update max viewer count in DB periodically
    if (count % 10 === 0) {
        await db.query(
            `UPDATE live_streams SET viewer_count = $1, max_viewer_count = GREATEST(max_viewer_count, $1) WHERE id = $2`,
            [count, streamId]
        );
    }

    return count;
}

/**
 * Decrement viewer count for a stream.
 */
export async function decrementViewerCount(streamId: string): Promise<number> {
    const key = `live:viewers:${streamId}`;
    const count = await redisClient.decr(key);
    const safeCount = count < 0 ? 0 : count;
    if (count < 0) {
        await redisClient.setEx(key, 3600, '0');
    }
    return safeCount;
}

// ─── Chat Management ────────────────────────────────────────────

/**
 * Send a chat message in a stream.
 */
export async function sendChatMessage(
    streamId: string,
    userId: string,
    userName: string,
    message: string
): Promise<ChatMessage> {
    // Verify stream exists and is live
    const stream = await getStream(streamId);
    if (stream.status !== 'live') {
        throw new ValidationError('Stream is not live', ErrorCode.INVALID_INPUT);
    }

    // Rate limit: max 30 messages per minute per user
    const rateKey = `live:chat:ratelimit:${streamId}:${userId}`;
    const msgCount = await redisClient.incr(rateKey);
    if (msgCount === 1) {
        await redisClient.expire(rateKey, 60);
    }
    if (msgCount > 30) {
        throw new RateLimitError(
            'Chat rate limit exceeded: max 30 messages per minute',
            ErrorCode.RATE_LIMIT_EXCEEDED
        );
    }

    // Moderation: check for common profanity
    const moderatedMessage = moderateMessage(message);

    const { rows } = await db.query(
        `
        INSERT INTO live_messages (stream_id, user_id, user_name, message, moderated)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, stream_id as "streamId", user_id as "userId",
                  user_name as "userName", message, created_at as "createdAt"
        `,
        [streamId, userId, userName, moderatedMessage, moderatedMessage !== message]
    );

    const chatMessage: ChatMessage = {
        id: String(rows[0].id),
        streamId: String(rows[0].streamId),
        userId: String(rows[0].userId),
        userName: rows[0].userName,
        message: rows[0].message,
        createdAt: new Date(rows[0].createdAt),
    };

    return chatMessage;
}

/**
 * Get chat messages for a stream.
 */
export async function getChatMessages(streamId: string, limit: number = 50): Promise<ChatMessage[]> {
    const { rows } = await db.query(
        `
        SELECT id, stream_id as "streamId", user_id as "userId",
               user_name as "userName", message, created_at as "createdAt"
        FROM live_messages
        WHERE stream_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [streamId, limit]
    );

    return rows.reverse().map((row) => ({
        id: String(row.id),
        streamId: String(row.streamId),
        userId: String(row.userId),
        userName: row.userName,
        message: row.message,
        createdAt: new Date(row.createdAt),
    }));
}

// ─── WebRTC Signaling ───────────────────────────────────────────

/**
 * Store a WebRTC signaling message for relay.
 */
export async function storeSignal(signal: WebRTCSignal): Promise<void> {
    const key = `live:signal:${signal.streamId}:${signal.toUserId || 'broadcast'}`;
    await redisClient.lPush(key, JSON.stringify(signal));
    await redisClient.expire(key, 60);
}

/**
 * Retrieve pending signaling messages for a user in a stream.
 */
export async function getSignals(streamId: string, userId: string): Promise<WebRTCSignal[]> {
    const key = `live:signal:${streamId}:${userId}`;
    const items = await redisClient.lRange(key, 0, -1);
    await redisClient.del(key);
    return items.map((item) => JSON.parse(item));
}

// ─── Helpers ────────────────────────────────────────────────────

import { RateLimitError } from '../../core/errors';

/**
 * Simple moderation for chat messages.
 */
function moderateMessage(message: string): string {
    const profanityList = ['spam', 'scam', 'fake', 'fraud'];
    let moderated = message;
    for (const word of profanityList) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        moderated = moderated.replace(regex, '***');
    }
    return moderated;
}
