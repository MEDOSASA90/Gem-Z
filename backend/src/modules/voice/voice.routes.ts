/**
 * GEM Z — Voice Command Routes
 *
 * Routes for voice command processing:
 *   - Process voice commands via Whisper API
 *   - Speech-to-text conversion
 *   - Intent recognition
 *   - Command history
 */

import express from 'express';
import { VoiceController } from './voice.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';

const router = express.Router();

// ─── Voice Processing ───────────────────────────────────────────

router.post(
    '/process',
    authenticate as any,
    validateBody(VoiceController.validations.processVoice) as any,
    VoiceController.processVoice as any
);

router.post(
    '/text',
    authenticate as any,
    validateBody(VoiceController.validations.textCommand) as any,
    VoiceController.processTextCommand as any
);

router.post(
    '/intent',
    authenticate as any,
    validateBody(VoiceController.validations.textCommand) as any,
    VoiceController.recognizeIntent as any
);

// ─── Command History ────────────────────────────────────────────

router.get(
    '/history',
    authenticate as any,
    validateQuery(VoiceController.validations.history) as any,
    VoiceController.getHistory as any
);

router.get(
    '/history/:commandId',
    authenticate as any,
    VoiceController.getById as any
);

router.delete(
    '/history/:commandId',
    authenticate as any,
    VoiceController.delete as any
);

// ─── Status ─────────────────────────────────────────────────────

router.get(
    '/status',
    VoiceController.getStatus as any
);

export default router;
