/**
 * GEM Z — AI Chatbot Controller
 *
 * Handles HTTP requests for AI fitness coaching chat:
 *   - POST /api/v1/chatbot/chat           — Send message and get AI response
 *   - GET  /api/v1/chatbot/conversations  — List user conversations
 *   - GET  /api/v1/chatbot/:id/messages   — Get conversation messages
 *   - DELETE /api/v1/chatbot/:id          — Delete conversation
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
import * as ChatbotService from './chatbot.service';

const log = createLogger('chatbot-controller');

export class ChatbotController {
    /**
     * POST /api/v1/chatbot/chat
     * Send a message to the AI coach and receive a response.
     */
    static async chat(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { message, conversationId } = req.body;

            if (!message || message.trim().length === 0) {
                throw new ValidationError('Message is required', ErrorCode.MISSING_FIELD);
            }

            const result = await ChatbotService.sendMessage(userId, message.trim(), conversationId);

            res.status(200).json({
                success: true,
                message: 'Message processed',
                response: result.message,
                conversationId: result.conversationId,
                suggestions: result.suggestions,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/chatbot/conversations
     * List all conversations for the authenticated user.
     */
    static async listConversations(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const status = req.query.status as 'active' | 'archived' | 'deleted' | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { conversations, total } = await ChatbotService.listConversations({
                userId,
                status,
                limit,
                offset,
            });

            res.status(200).json({
                success: true,
                data: conversations,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/chatbot/:id/messages
     * Get messages in a specific conversation.
     */
    static async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id: conversationId } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const { messages, total } = await ChatbotService.getConversationMessages(
                userId,
                conversationId,
                limit,
                offset
            );

            res.status(200).json({
                success: true,
                data: messages,
                pagination: { total, limit, offset },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/chatbot/:id
     * Soft-delete a conversation.
     */
    static async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id: conversationId } = req.params;
            await ChatbotService.deleteConversation(userId, conversationId);

            res.status(200).json({
                success: true,
                message: 'Conversation deleted',
            });
        } catch (error) {
            next(error);
        }
    }
}
