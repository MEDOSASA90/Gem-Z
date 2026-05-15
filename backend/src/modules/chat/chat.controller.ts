/**
 * GEM Z — Chat Controller
 *
 * HTTP handlers for:
 *   - Sending messages
 *   - Retrieving message history
 *   - Listing conversations
 *   - Marking messages as read
 *   - Deleting conversations
 *   - Getting unread counts
 */

import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
    buildErrorResponse,
} from '../../core/errors';
import {
    sendMessage,
    getMessageHistory,
    markMessagesAsRead,
    getConversations,
    getConversation,
    getUnreadCount,
    deleteConversation,
    setTypingStatus,
} from './chat.service';

const log = createLogger('chat:controller');

// ─── Validation Rules ───────────────────────────────────────────

const sendMessageValidation = [
    body('receiverId')
        .trim().notEmpty().withMessage('Receiver ID is required')
        .isUUID().withMessage('Invalid receiver ID'),
    body('content')
        .trim().notEmpty().withMessage('Message content is required')
        .isLength({ max: 4000 }).withMessage('Message must not exceed 4000 characters'),
    body('messageType')
        .optional()
        .isIn(['text', 'image', 'voice', 'file']).withMessage('Invalid message type'),
    body('fileUrl')
        .optional({ checkFalsy: true })
        .trim()
        .isURL().withMessage('Invalid file URL'),
];

const getMessagesValidation = [
    param('roomId').trim().notEmpty().withMessage('Room ID is required').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const markReadValidation = [
    param('roomId').trim().notEmpty().withMessage('Room ID is required').isUUID(),
];

const typingValidation = [
    body('roomId').trim().notEmpty().withMessage('Room ID is required').isUUID(),
    body('isTyping').isBoolean().withMessage('isTyping must be a boolean'),
];

// ─── Controller ─────────────────────────────────────────────────

export class ChatController {
    /**
     * POST /api/v1/chat/messages
     * Send a message to another user.
     */
    static async sendMessage(req: AuthRequest, res: Response) {
        try {
            const senderId = req.user?.userId;
            if (!senderId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { receiverId, content, messageType, fileUrl } = req.body;

            const message = await sendMessage({
                senderId,
                receiverId,
                content,
                messageType: messageType || 'text',
                fileUrl,
            });

            log.info({ messageId: message.id, senderId, receiverId }, 'Message sent via API');

            return res.status(201).json({
                success: true,
                message: 'Message sent',
                data: message,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to send message');
            return res.status(500).json({
                success: false,
                message: 'Failed to send message',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/chat/messages/:roomId
     * Get message history for a conversation.
     */
    static async getMessages(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { roomId } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Math.min(Number(req.query.limit) || 50, 100);

            const result = await getMessageHistory({ roomId, userId, page, limit });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get messages');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve messages',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/chat/messages/:roomId/read
     * Mark all messages in a conversation as read.
     */
    static async markAsRead(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { roomId } = req.params;
            const count = await markMessagesAsRead(roomId, userId);

            return res.status(200).json({
                success: true,
                message: 'Messages marked as read',
                data: { markedCount: count },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to mark as read');
            return res.status(500).json({
                success: false,
                message: 'Failed to mark messages as read',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/chat/conversations
     * Get all conversations for the authenticated user.
     */
    static async getConversations(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const conversations = await getConversations(userId);

            return res.status(200).json({
                success: true,
                data: conversations,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get conversations');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve conversations',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/chat/conversations/:roomId
     * Get a single conversation.
     */
    static async getConversation(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { roomId } = req.params;
            const conversation = await getConversation(roomId, userId);

            return res.status(200).json({
                success: true,
                data: conversation,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get conversation');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve conversation',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/chat/unread
     * Get total unread message count.
     */
    static async getUnreadCount(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const count = await getUnreadCount(userId);

            return res.status(200).json({
                success: true,
                data: { unreadCount: count },
            });
        } catch (error) {
            log.error({ error: (error as Error).message }, 'Failed to get unread count');
            return res.status(500).json({
                success: false,
                message: 'Failed to get unread count',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * DELETE /api/v1/chat/conversations/:roomId
     * Delete a conversation.
     */
    static async deleteConversation(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { roomId } = req.params;
            await deleteConversation(roomId, userId);

            return res.status(200).json({
                success: true,
                message: 'Conversation deleted',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to delete conversation');
            return res.status(500).json({
                success: false,
                message: 'Failed to delete conversation',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/chat/typing
     * Set typing status.
     */
    static async setTyping(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { roomId, isTyping } = req.body;
            await setTypingStatus({ roomId, userId, isTyping });

            return res.status(200).json({
                success: true,
                message: 'Typing status updated',
            });
        } catch (error) {
            log.error({ error: (error as Error).message }, 'Failed to set typing status');
            return res.status(500).json({
                success: false,
                message: 'Failed to update typing status',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── Validation Middleware Exports ──────────────────────────

    static validations = {
        sendMessage: sendMessageValidation,
        getMessages: getMessagesValidation,
        markRead: markReadValidation,
        typing: typingValidation,
    };
}
