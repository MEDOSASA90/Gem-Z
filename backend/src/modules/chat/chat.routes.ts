/**
 * GEM Z — Chat Routes
 *
 * Routes for in-app messaging:
 *   - Send/receive messages
 *   - Conversation management
 *   - Read receipts
 *   - Typing indicators
 */

import express from 'express';
import { ChatController } from './chat.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';

const router = express.Router();

// ─── Conversations ──────────────────────────────────────────────

router.get(
    '/conversations',
    authenticate as any,
    ChatController.getConversations as any
);

router.get(
    '/conversations/:roomId',
    authenticate as any,
    ChatController.getConversation as any
);

router.delete(
    '/conversations/:roomId',
    authenticate as any,
    validateParams([...ChatController.validations.markRead]) as any,
    ChatController.deleteConversation as any
);

// ─── Messages ───────────────────────────────────────────────────

router.post(
    '/messages',
    authenticate as any,
    validateBody(ChatController.validations.sendMessage) as any,
    ChatController.sendMessage as any
);

router.get(
    '/messages/:roomId',
    authenticate as any,
    validateParams(ChatController.validations.getMessages) as any,
    ChatController.getMessages as any
);

// ─── Read Receipts ──────────────────────────────────────────────

router.post(
    '/messages/:roomId/read',
    authenticate as any,
    validateParams(ChatController.validations.markRead) as any,
    ChatController.markAsRead as any
);

// ─── Typing Indicators ──────────────────────────────────────────

router.post(
    '/typing',
    authenticate as any,
    validateBody(ChatController.validations.typing) as any,
    ChatController.setTyping as any
);

// ─── Unread Count ───────────────────────────────────────────────

router.get(
    '/unread',
    authenticate as any,
    ChatController.getUnreadCount as any
);

export default router;
