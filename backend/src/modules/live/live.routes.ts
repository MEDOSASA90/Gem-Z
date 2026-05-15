/**
 * GEM Z — Live Streaming Routes
 *
 * Routes:
 *   POST /api/v1/live/start       — Start stream
 *   POST /api/v1/live/stop        — Stop stream
 *   GET  /api/v1/live/active      — Get active streams
 *   GET  /api/v1/live/:id         — Join stream
 *   POST /api/v1/live/:id/chat    — Send chat message
 *   GET  /api/v1/live/:id/chat    — Get chat messages
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery, requiredString } from '../../core/middlewares/validation.middleware';
import { LiveController } from './live.controller';

const router = express.Router();

// ─── Stream Management ──────────────────────────────────────────

router.post('/start', authenticate as any, validateBody([
    requiredString('title'),
    body('description').optional().trim().isString().isLength({ max: 500 }),
    body('thumbnailUrl').optional().trim().isURL(),
    body('tags').optional().isArray().custom((tags: string[]) =>
        tags.every((t) => typeof t === 'string' && t.length <= 30)
    ).withMessage('Each tag must be a string of max 30 characters'),
]), LiveController.startStream as any);

router.post('/stop', authenticate as any, validateBody([
    body('streamId').trim().notEmpty().withMessage('streamId is required').isUUID().withMessage('Invalid stream ID'),
]), LiveController.stopStream as any);

router.get('/active', authenticate as any, LiveController.getActiveStreams as any);

// ─── Stream Interaction ─────────────────────────────────────────

router.get('/:id', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Stream ID is required').isUUID().withMessage('Invalid stream ID'),
]), LiveController.joinStream as any);

router.post('/:id/chat', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Stream ID is required').isUUID(),
]), validateBody([
    requiredString('message'),
]), LiveController.sendChatMessage as any);

router.get('/:id/chat', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Stream ID is required').isUUID(),
]), validateQuery([
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
]), LiveController.getChatMessages as any);

export default router;
