/**
 * GEM Z — Voice Command Controller
 *
 * HTTP handlers for:
 *   - Processing voice commands via Whisper API
 *   - Speech-to-text conversion
 *   - Command parsing and intent recognition
 *   - Command history retrieval
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
    processVoiceCommand,
    getCommandHistory,
    getCommandById,
    deleteCommand,
    isVoiceAvailable,
    SUPPORTED_LANGUAGES,
    recognizeIntent,
} from './voice.service';

const log = createLogger('voice:controller');

// ─── Validation Rules ───────────────────────────────────────────

const processVoiceValidation = [
    body('audioData')
        .optional()
        .isString().withMessage('Audio data must be a base64 string'),
    body('audioUrl')
        .optional({ checkFalsy: true })
        .isURL().withMessage('Invalid audio URL'),
    body('transcript')
        .optional({ checkFalsy: true })
        .isString().isLength({ max: 1000 }).withMessage('Transcript too long'),
    body('language')
        .optional()
        .isIn(['en', 'ar', 'es', 'fr', 'de']).withMessage('Unsupported language'),
];

const textCommandValidation = [
    body('text')
        .trim().notEmpty().withMessage('Command text is required')
        .isLength({ max: 1000 }).withMessage('Command text too long'),
    body('language')
        .optional()
        .isIn(['en', 'ar', 'es', 'fr', 'de']).withMessage('Unsupported language'),
];

const historyValidation = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('intent').optional().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
];

// ─── Controller ─────────────────────────────────────────────────

export class VoiceController {
    /**
     * POST /api/v1/voice/process
     * Process a voice command (audio or transcript).
     */
    static async processVoice(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { audioData, audioUrl, transcript, language } = req.body;

            if (!audioData && !audioUrl && !transcript) {
                return res.status(400).json({
                    success: false,
                    message: 'Audio data, URL, or transcript is required',
                    code: ErrorCode.INVALID_INPUT,
                });
            }

            const command = await processVoiceCommand({
                userId,
                audioData,
                audioUrl,
                transcript,
                language,
            });

            log.info({ commandId: command.id, userId, intent: command.intent }, 'Voice command processed');

            return res.status(200).json({
                success: true,
                message: 'Voice command processed',
                data: {
                    commandId: command.id,
                    transcript: command.transcript,
                    intent: command.intent,
                    confidence: command.confidence,
                    entities: command.entities,
                    suggestedAction: command.action,
                    responseText: getResponseText(command.intent),
                    processingTimeMs: command.processingTimeMs,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to process voice command');
            return res.status(500).json({
                success: false,
                message: 'Failed to process voice command',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/voice/text
     * Process a text command (no audio required).
     */
    static async processTextCommand(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { text, language = 'en' } = req.body;

            const command = await processVoiceCommand({
                userId,
                transcript: text,
                language,
            });

            return res.status(200).json({
                success: true,
                message: 'Text command processed',
                data: {
                    commandId: command.id,
                    transcript: command.transcript,
                    intent: command.intent,
                    confidence: command.confidence,
                    entities: command.entities,
                    suggestedAction: command.action,
                    responseText: getResponseText(command.intent),
                    processingTimeMs: command.processingTimeMs,
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to process text command');
            return res.status(500).json({
                success: false,
                message: 'Failed to process text command',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * POST /api/v1/voice/intent
     * Recognize intent from text (without saving).
     */
    static async recognizeIntent(req: AuthRequest, res: Response) {
        try {
            const { text, language = 'en' } = req.body;

            if (!text || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Text is required',
                    code: ErrorCode.INVALID_INPUT,
                });
            }

            const result = recognizeIntent(text, language);

            return res.status(200).json({
                success: true,
                data: {
                    ...result,
                    responseText: getResponseText(result.intent),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to recognize intent');
            return res.status(500).json({
                success: false,
                message: 'Failed to recognize intent',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/voice/history
     * Get voice command history for the authenticated user.
     */
    static async getHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const result = await getCommandHistory({
                userId,
                page: Number(req.query.page) || 1,
                limit: Math.min(Number(req.query.limit) || 20, 100),
                intent: (req.query.intent as string) || undefined,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get history');
            return res.status(500).json({
                success: false,
                message: 'Failed to get command history',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/voice/history/:commandId
     * Get a single voice command by ID.
     */
    static async getById(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { commandId } = req.params;
            const command = await getCommandById(commandId, userId);

            if (!command) {
                return res.status(404).json({
                    success: false,
                    message: 'Command not found',
                    code: ErrorCode.NOT_FOUND_RESOURCE,
                });
            }

            return res.status(200).json({
                success: true,
                data: command,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to get command');
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve command',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * DELETE /api/v1/voice/history/:commandId
     * Delete a voice command record.
     */
    static async delete(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: ErrorCode.AUTH_UNAUTHORIZED,
                });
            }

            const { commandId } = req.params;
            await deleteCommand(commandId, userId);

            return res.status(200).json({
                success: true,
                message: 'Command deleted',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(buildErrorResponse(error));
            }
            log.error({ error: (error as Error).message }, 'Failed to delete command');
            return res.status(500).json({
                success: false,
                message: 'Failed to delete command',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    /**
     * GET /api/v1/voice/status
     * Get voice processing status and supported languages.
     */
    static async getStatus(req: AuthRequest, res: Response) {
        try {
            const available = isVoiceAvailable();

            return res.status(200).json({
                success: true,
                data: {
                    available,
                    engine: available ? 'OpenAI Whisper' : 'Fallback (offline)',
                    supportedLanguages: SUPPORTED_LANGUAGES,
                    maxAudioLength: '25 MB',
                    maxDuration: '60 seconds',
                },
            });
        } catch (error) {
            log.error({ error: (error as Error).message }, 'Failed to get status');
            return res.status(500).json({
                success: false,
                message: 'Failed to get voice status',
                code: ErrorCode.SERVER_ERROR,
            });
        }
    }

    // ─── Validation Middleware Exports ──────────────────────────

    static validations = {
        processVoice: processVoiceValidation,
        textCommand: textCommandValidation,
        history: historyValidation,
    };
}

// ─── Response Text Helper ───────────────────────────────────────

function getResponseText(intent: string): string {
    const responses: Record<string, string> = {
        start_workout: 'Starting your workout! Get ready to move.',
        stop_workout: 'Great job! Workout completed.',
        pause_workout: 'Workout paused. Take a breather.',
        resume_workout: 'Resuming your workout!',
        next_exercise: 'Moving to the next exercise.',
        previous_exercise: 'Going back to the previous exercise.',
        show_stats: 'Here are your workout stats!',
        show_profile: 'Opening your profile.',
        search_exercise: 'Searching for exercises...',
        play_video: 'Playing the video.',
        set_timer: 'Timer set!',
        check_progress: 'Let me check your progress.',
        book_session: 'Opening session booking.',
        unknown: "I'm not sure what you mean. Can you try rephrasing?",
    };

    return responses[intent] || 'Command recognized.';
}
