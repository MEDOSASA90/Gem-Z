/**
 * GEM Z — AI Chatbot Routes
 *
 * Routes:
 *   POST   /api/v1/chatbot/chat           — Send message
 *   GET    /api/v1/chatbot/conversations  — List conversations
 *   GET    /api/v1/chatbot/:id/messages   — Get conversation messages
 *   DELETE /api/v1/chatbot/:id            — Delete conversation
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { ChatbotController } from './chatbot.controller';

const router = express.Router();

// ─── Chat ───────────────────────────────────────────────────────

router.post('/chat', authenticate as any, validateBody([
    body('message')
        .trim()
        .notEmpty()
        .withMessage('message is required')
        .isLength({ max: 2000 })
        .withMessage('message must not exceed 2000 characters'),
    body('conversationId').optional().trim().isUUID().withMessage('conversationId must be a valid UUID'),
]), ChatbotController.chat as any);

// ─── Conversations ──────────────────────────────────────────────

router.get('/conversations', authenticate as any, validateQuery([
    query('status').optional().trim().isIn(['active', 'archived', 'deleted']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), ChatbotController.listConversations as any);

router.get('/:id/messages', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Conversation ID is required').isUUID(),
]), validateQuery([
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
]), ChatbotController.getMessages as any);

router.delete('/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Conversation ID is required').isUUID(),
]), ChatbotController.deleteConversation as any);

export default router;
