/**
 * GEM Z — Voice Command Service
 *
 * Speech-to-text and intent recognition for voice commands.
 * Features:
 *   - Process voice via Whisper API
 *   - Parse commands and extract intents
 *   - Command history tracking
 *   - Support for multiple languages
 *   - Confidence scoring
 */

import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
    ServiceUnavailableError,
} from '../../core/errors';
import { config } from '../../config';
import { redisClient } from '../../core/redis/client';

const log = createLogger('voice');

// ─── Types ──────────────────────────────────────────────────────

export interface VoiceCommand {
    id: string;
    userId: string;
    audioUrl?: string;
    transcript: string;
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    language: string;
    action?: string;
    actionResult?: any;
    processingTimeMs: number;
    createdAt: Date;
}

export interface IntentResult {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    suggestedAction?: string;
    responseText?: string;
}

export interface ProcessVoiceInput {
    userId: string;
    audioData?: string; // Base64 audio
    audioUrl?: string;
    transcript?: string; // If already transcribed
    language?: string;
}

export interface VoiceCommandHistoryOptions {
    userId: string;
    page?: number;
    limit?: number;
    intent?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface PaginatedCommands {
    commands: VoiceCommand[];
    total: number;
    page: number;
    totalPages: number;
    stats: {
        totalCommands: number;
        commandsByIntent: Record<string, number>;
        avgConfidence: number;
    };
}

export type VoiceIntent =
    | 'start_workout'
    | 'stop_workout'
    | 'pause_workout'
    | 'resume_workout'
    | 'next_exercise'
    | 'previous_exercise'
    | 'show_stats'
    | 'show_profile'
    | 'search_exercise'
    | 'play_video'
    | 'set_timer'
    | 'check_progress'
    | 'book_session'
    | 'unknown';

// ─── Intent Patterns ────────────────────────────────────────────

interface IntentPattern {
    intent: VoiceIntent;
    patterns: RegExp[];
    keywords: string[];
    entities?: string[];
    responseText?: string;
    suggestedAction?: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
    {
        intent: 'start_workout',
        patterns: [
            /^(?:start|begin|let's)\s+(?:a?\s*)?(?:workout|training|exercise)/i,
            /^(?:i\s+want\s+to)\s+(?:start|begin)/i,
        ],
        keywords: ['start', 'begin', 'workout', 'training', 'exercise', 'go'],
        entities: ['workout_type', 'duration'],
        responseText: 'Starting your workout! Get ready to move.',
        suggestedAction: '/workouts/start',
    },
    {
        intent: 'stop_workout',
        patterns: [
            /^(?:stop|end|finish)\s+(?:the\s*)?(?:workout|training|exercise)/i,
            /^i'?m\s+(?:done|finished)/i,
        ],
        keywords: ['stop', 'end', 'finish', 'done'],
        responseText: 'Great job! Workout completed.',
        suggestedAction: '/workouts/finish',
    },
    {
        intent: 'pause_workout',
        patterns: [
            /^(?:pause|hold|wait)/i,
        ],
        keywords: ['pause', 'hold', 'wait', 'break'],
        responseText: 'Workout paused. Take a breather.',
        suggestedAction: '/workouts/pause',
    },
    {
        intent: 'resume_workout',
        patterns: [
            /^(?:resume|continue|go\s+on)/i,
        ],
        keywords: ['resume', 'continue', 'go'],
        responseText: 'Resuming your workout!',
        suggestedAction: '/workouts/resume',
    },
    {
        intent: 'next_exercise',
        patterns: [
            /^(?:next|skip)\s+(?:exercise|set|rep)/i,
            /^next\s+please/i,
        ],
        keywords: ['next', 'skip', 'forward'],
        responseText: 'Moving to the next exercise.',
        suggestedAction: '/workouts/next',
    },
    {
        intent: 'previous_exercise',
        patterns: [
            /^(?:previous|back|go\s+back)/i,
        ],
        keywords: ['previous', 'back', 'before'],
        responseText: 'Going back to the previous exercise.',
        suggestedAction: '/workouts/previous',
    },
    {
        intent: 'show_stats',
        patterns: [
            /^(?:show|display|view|see)\s+(?:my\s*)?(?:stats|statistics|progress)/i,
            /^how\s+(?:am\s+i|have\s+i)\s+(?:doing|progressing)/i,
        ],
        keywords: ['stats', 'progress', 'performance', 'numbers', 'data'],
        responseText: 'Here are your workout stats!',
        suggestedAction: '/stats',
    },
    {
        intent: 'show_profile',
        patterns: [
            /^(?:show|open|view|go\s+to)\s+(?:my\s*)?(?:profile|account)/i,
        ],
        keywords: ['profile', 'account', 'me', 'my info'],
        responseText: 'Opening your profile.',
        suggestedAction: '/profile',
    },
    {
        intent: 'search_exercise',
        patterns: [
            /^(?:search|find|look\s+for|show\s+me)\s+(?:a?n?\s*)?(?:exercise|workout)/i,
        ],
        keywords: ['search', 'find', 'exercise', 'workout'],
        entities: ['exercise_name', 'body_part'],
        responseText: 'Searching for exercises...',
        suggestedAction: '/exercises/search',
    },
    {
        intent: 'play_video',
        patterns: [
            /^(?:play|watch|show)\s+(?:the\s*)?(?:video|tutorial)/i,
        ],
        keywords: ['play', 'watch', 'video', 'tutorial'],
        entities: ['video_title'],
        responseText: 'Playing the video.',
        suggestedAction: '/videos',
    },
    {
        intent: 'set_timer',
        patterns: [
            /^(?:set|start)\s+(?:a?\s*)?(?:timer|countdown)/i,
            /^timer\s+for\s+(\d+)/i,
        ],
        keywords: ['timer', 'countdown', 'minutes', 'seconds'],
        entities: ['duration'],
        responseText: 'Timer set!',
        suggestedAction: '/timer',
    },
    {
        intent: 'check_progress',
        patterns: [
            /^(?:check|see|how\s+is)\s+(?:my\s*)?progress/i,
            /^how\s+(?:many|much)\s+(?:workouts|calories)/i,
        ],
        keywords: ['progress', 'check', 'how many', 'goals'],
        responseText: 'Let me check your progress.',
        suggestedAction: '/progress',
    },
    {
        intent: 'book_session',
        patterns: [
            /^(?:book|schedule|reserve)\s+(?:a?\s*)?(?:session|appointment|class)/i,
        ],
        keywords: ['book', 'schedule', 'session', 'trainer'],
        entities: ['trainer_name', 'date', 'time'],
        responseText: 'Opening session booking.',
        suggestedAction: '/sessions/book',
    },
];

// ─── Service ────────────────────────────────────────────────────

/**
 * Process a voice command: transcribe audio and recognize intent.
 *
 * @param input - Voice input data
 * @returns Processed command with intent and entities
 */
export async function processVoiceCommand(input: ProcessVoiceInput): Promise<VoiceCommand> {
    const startTime = Date.now();
    const { userId, audioData, audioUrl, language = 'en' } = input;
    let transcript = input.transcript || '';

    if (!userId) {
        throw new ValidationError('User ID is required', ErrorCode.INVALID_INPUT);
    }

    if (!audioData && !audioUrl && !transcript) {
        throw new ValidationError('Audio data, URL, or transcript is required', ErrorCode.INVALID_INPUT);
    }

    try {
        // Step 1: Transcribe if needed
        if (!transcript && (audioData || audioUrl)) {
            transcript = await transcribeAudio(audioData, audioUrl, language);
        }

        if (!transcript || transcript.trim().length === 0) {
            throw new ValidationError('Could not transcribe audio', ErrorCode.INVALID_INPUT);
        }

        // Step 2: Recognize intent
        const intentResult = recognizeIntent(transcript, language);

        // Step 3: Save command
        const commandId = generateCommandId();
        const processingTimeMs = Date.now() - startTime;

        const result = await db.query(
            `INSERT INTO voice_commands
                (id, user_id, audio_url, transcript, intent, entities, confidence, language, action, processing_time_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                commandId,
                userId,
                audioUrl || null,
                transcript,
                intentResult.intent,
                JSON.stringify(intentResult.entities),
                intentResult.confidence,
                language,
                intentResult.suggestedAction || null,
                processingTimeMs,
            ]
        );

        log.info({
            commandId,
            userId,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            transcript: transcript.slice(0, 50),
        }, 'Voice command processed');

        return mapCommandRow(result.rows[0]);
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to process voice command');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to process voice command', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Transcribe audio using OpenAI Whisper API.
 *
 * @param audioData - Base64-encoded audio data
 * @param audioUrl - URL to audio file
 * @param language - Language code
 * @returns Transcribed text
 */
async function transcribeAudio(
    audioData?: string,
    audioUrl?: string,
    language: string = 'en'
): Promise<string> {
    if (!config.openaiApiKey) {
        log.warn('OpenAI API key not configured, using fallback transcription');
        return fallbackTranscription();
    }

    try {
        // Build the request for Whisper API
        const formData = new FormData();
        formData.append('model', 'whisper-1');
        formData.append('language', language);

        let blob: Blob;

        if (audioData) {
            // Decode base64 audio
            const byteCharacters = atob(audioData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'audio/webm' });
        } else if (audioUrl) {
            // Fetch audio from URL
            const response = await fetch(audioUrl);
            blob = await response.blob();
        } else {
            throw new Error('No audio data provided');
        }

        formData.append('file', blob, 'audio.webm');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.openaiApiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Whisper API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.text || '';
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Whisper transcription failed, using fallback');
        return fallbackTranscription();
    }
}

/**
 * Fallback transcription when Whisper is unavailable.
 * Returns placeholder text for demo/development.
 */
function fallbackTranscription(): string {
    return '';
}

/**
 * Recognize intent from transcribed text.
 *
 * @param transcript - Transcribed text
 * @param language - Language code
 * @returns Intent recognition result
 */
export function recognizeIntent(transcript: string, language: string = 'en'): IntentResult {
    const text = transcript.toLowerCase().trim();

    // Try regex patterns first
    for (const pattern of INTENT_PATTERNS) {
        for (const regex of pattern.patterns) {
            const match = text.match(regex);
            if (match) {
                const entities = extractEntities(text, pattern.entities || [], match);
                return {
                    intent: pattern.intent,
                    confidence: 0.92,
                    entities,
                    suggestedAction: pattern.suggestedAction,
                    responseText: pattern.responseText,
                };
            }
        }
    }

    // Keyword matching as fallback
    let bestMatch: IntentPattern | null = null;
    let bestScore = 0;

    for (const pattern of INTENT_PATTERNS) {
        const score = pattern.keywords.reduce((acc, keyword) => {
            return text.includes(keyword.toLowerCase()) ? acc + 1 : acc;
        }, 0);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = pattern;
        }
    }

    if (bestMatch && bestScore >= 1) {
        const entities = extractEntities(text, bestMatch.entities || []);
        return {
            intent: bestMatch.intent,
            confidence: Math.min(0.5 + bestScore * 0.1, 0.85),
            entities,
            suggestedAction: bestMatch.suggestedAction,
            responseText: bestMatch.responseText,
        };
    }

    // Unknown intent
    return {
        intent: 'unknown',
        confidence: 0.3,
        entities: { raw_text: text },
        responseText: "I'm not sure what you mean. Can you try rephrasing?",
    };
}

/**
 * Extract entities from the transcript text.
 */
function extractEntities(
    text: string,
    entityTypes: string[],
    regexMatch?: RegExpMatchArray
): Record<string, any> {
    const entities: Record<string, any> = {};

    for (const type of entityTypes) {
        switch (type) {
            case 'duration':
                const durationMatch = text.match(/(\d+)\s*(minute|min|hour|second|sec)s?/i);
                if (durationMatch) {
                    entities.duration = {
                        value: Number(durationMatch[1]),
                        unit: durationMatch[2],
                    };
                }
                break;
            case 'workout_type':
                const workoutTypes = ['cardio', 'strength', 'hiit', 'yoga', 'stretching', 'pilates', 'crossfit'];
                for (const wt of workoutTypes) {
                    if (text.includes(wt)) {
                        entities.workout_type = wt;
                        break;
                    }
                }
                break;
            case 'body_part':
                const bodyParts = ['chest', 'back', 'legs', 'arms', 'shoulders', 'abs', 'core', 'biceps', 'triceps'];
                for (const bp of bodyParts) {
                    if (text.includes(bp)) {
                        entities.body_part = bp;
                        break;
                    }
                }
                break;
            case 'exercise_name':
                // Extract potential exercise names (text after "for" or search terms)
                const exerciseMatch = text.match(/(?:for|search|find)\s+(.+)/i);
                if (exerciseMatch) {
                    entities.exercise_name = exerciseMatch[1].trim();
                }
                break;
        }
    }

    return entities;
}

/**
 * Get command history for a user.
 *
 * @param options - Query options
 * @returns Paginated commands
 */
export async function getCommandHistory(
    options: VoiceCommandHistoryOptions
): Promise<PaginatedCommands> {
    const { userId, page = 1, limit = 20, intent, startDate, endDate } = options;

    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (intent) {
        conditions.push(`intent = $${paramIndex++}`);
        values.push(intent);
    }
    if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(startDate);
    }
    if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(endDate);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    try {
        const [commandsResult, countResult, statsResult] = await Promise.all([
            db.query(
                `SELECT * FROM voice_commands WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) as total FROM voice_commands WHERE ${whereClause}`,
                values
            ),
            db.query(
                `SELECT
                    intent,
                    COUNT(*) as count,
                    AVG(confidence) as avg_confidence
                 FROM voice_commands
                 WHERE user_id = $1
                 GROUP BY intent`,
                [userId]
            ),
        ]);

        const total = Number(countResult.rows[0].total);
        const commandsByIntent: Record<string, number> = {};
        let totalConfidence = 0;
        let intentCount = 0;

        for (const row of statsResult.rows) {
            commandsByIntent[row.intent] = Number(row.count);
            totalConfidence += Number(row.avg_confidence);
            intentCount++;
        }

        return {
            commands: commandsResult.rows.map(mapCommandRow),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: {
                totalCommands: total,
                commandsByIntent,
                avgConfidence: intentCount > 0 ? totalConfidence / intentCount : 0,
            },
        };
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to get command history');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to get command history', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get a single voice command by ID.
 */
export async function getCommandById(commandId: string, userId: string): Promise<VoiceCommand | null> {
    const result = await db.query(
        `SELECT * FROM voice_commands WHERE id = $1 AND user_id = $2`,
        [commandId, userId]
    );

    if (result.rowCount === 0) return null;
    return mapCommandRow(result.rows[0]);
}

/**
 * Delete a voice command record.
 */
export async function deleteCommand(commandId: string, userId: string): Promise<void> {
    const result = await db.query(
        `DELETE FROM voice_commands WHERE id = $1 AND user_id = $2 RETURNING id`,
        [commandId, userId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Command not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    log.info({ commandId, userId }, 'Voice command deleted');
}

// ─── Helpers ────────────────────────────────────────────────────

function mapCommandRow(row: any): VoiceCommand {
    return {
        id: row.id,
        userId: row.user_id,
        audioUrl: row.audio_url,
        transcript: row.transcript,
        intent: row.intent,
        entities: typeof row.entities === 'string' ? JSON.parse(row.entities) : row.entities || {},
        confidence: Number(row.confidence),
        language: row.language,
        action: row.action,
        actionResult: row.action_result,
        processingTimeMs: Number(row.processing_time_ms),
        createdAt: row.created_at,
    };
}

function generateCommandId(): string {
    return `vc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Supported Languages ────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
];

/**
 * Check if voice processing is available.
 */
export function isVoiceAvailable(): boolean {
    return Boolean(config.openaiApiKey);
}
