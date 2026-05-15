/**
 * GEM Z — Live Streaming Controller
 *
 * Handles HTTP requests for streaming:
 *   - Start stream
 *   - Stop stream
 *   - Get active streams
 *   - Join stream
 *   - Send chat message
 *   - Get chat messages
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import * as LiveService from './live.service';

const log = createLogger('live-controller');

export class LiveController {
    /**
     * POST /api/v1/live/start
     * Start a new live stream.
     */
    static async startStream(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hostId = req.user?.userId;
            const hostName = req.user?.role || 'Anonymous';
            if (!hostId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { title, description, thumbnailUrl, tags } = req.body;

            if (!title || title.trim().length === 0) {
                throw new ValidationError('Stream title is required', ErrorCode.MISSING_FIELD);
            }

            const stream = await LiveService.startStream(hostId, hostName, {
                title: title.trim(),
                description,
                thumbnailUrl,
                tags,
            });

            res.status(201).json({
                success: true,
                message: 'Stream started successfully',
                stream,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/live/stop
     * Stop the current user's active stream.
     */
    static async stopStream(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const hostId = req.user?.userId;
            if (!hostId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { streamId } = req.body;
            if (!streamId) {
                throw new ValidationError('streamId is required', ErrorCode.MISSING_FIELD);
            }

            const stream = await LiveService.stopStream(hostId, streamId);

            res.status(200).json({
                success: true,
                message: 'Stream stopped successfully',
                stream,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/live/active
     * Get all currently active streams.
     */
    static async getActiveStreams(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const streams = await LiveService.getActiveStreams();

            res.status(200).json({
                success: true,
                count: streams.length,
                streams,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/live/:id
     * Join a stream (get stream details).
     */
    static async joinStream(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;

            const stream = await LiveService.getStream(id);

            // Increment viewer count
            const viewerCount = await LiveService.incrementViewerCount(id);

            res.status(200).json({
                success: true,
                stream: {
                    ...stream,
                    viewerCount,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/live/:id/chat
     * Send a chat message in a stream.
     */
    static async sendChatMessage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            const userName = req.user?.role || 'Anonymous';
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id: streamId } = req.params;
            const { message } = req.body;

            if (!message || message.trim().length === 0) {
                throw new ValidationError('Message is required', ErrorCode.MISSING_FIELD);
            }

            const chatMessage = await LiveService.sendChatMessage(
                streamId,
                userId,
                userName,
                message.trim()
            );

            res.status(201).json({
                success: true,
                message: 'Chat message sent',
                chatMessage,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/live/:id/chat
     * Get chat messages for a stream.
     */
    static async getChatMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id: streamId } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

            const messages = await LiveService.getChatMessages(streamId, Math.min(limit, 100));

            res.status(200).json({
                success: true,
                count: messages.length,
                messages,
            });
        } catch (error) {
            next(error);
        }
    }
}
