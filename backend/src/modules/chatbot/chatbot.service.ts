/**
 * GEM Z — AI Chatbot Service
 *
 * Provides intelligent fitness coaching via OpenAI GPT-4o with
 * fitness-specific context. Manages conversation history, tracks
 * user context, and delivers personalized workout/nutrition advice.
 *
 * Features:
 *   - GPT-4o integration with fitness system prompt
 *   - Conversation history management
 *   - Context-aware responses (goals, preferences, history)
 *   - Rate limiting per user
 *   - Conversation persistence
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('chatbot');

// ─── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: Record<string, any> | null;
    createdAt: Date;
}

export interface ChatConversation {
    id: string;
    userId: string;
    title: string | null;
    status: 'active' | 'archived' | 'deleted';
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatResponse {
    message: ChatMessage;
    conversationId: string;
    suggestions: string[];
}

export interface ConversationFilters {
    userId?: string;
    status?: 'active' | 'archived' | 'deleted';
    limit?: number;
    offset?: number;
}

// ─── System Prompt ──────────────────────────────────────────────

const FITNESS_SYSTEM_PROMPT = `You are GemZ Coach, an expert AI fitness coach integrated into the GemZ fitness app. Your role is to help users achieve their fitness goals through personalized advice.

Your capabilities:
- Create and adjust workout plans based on user goals, equipment, and fitness level
- Provide nutrition advice, meal suggestions, and macro guidance
- Explain exercise form and technique with detailed cues
- Help with recovery, stretching, and injury prevention
- Motivate and track progress, celebrate milestones
- Answer questions about supplements, rest days, and training splits

Rules:
- Always prioritize user safety. If a user describes pain or injury, advise consulting a medical professional
- Keep responses concise but informative (max 200 words unless detailed plan requested)
- Use encouraging, professional tone
- Include specific numbers when possible (sets, reps, weights, calories)
- If unsure about medical advice, redirect to professionals
- Reference previous conversation context for continuity
- Support both Arabic and English responses based on user language`;

// ─── Rate Limiting ──────────────────────────────────────────────

const RATE_LIMIT_MESSAGES = 30; // per hour
const RATE_LIMIT_WINDOW = 3600; // seconds

/**
 * Check rate limit for chat messages.
 */
async function checkRateLimit(userId: string): Promise<void> {
    const key = `chatbot:ratelimit:${userId}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
        await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }
    if (count > RATE_LIMIT_MESSAGES) {
        throw new RateLimitError(
            `Chat rate limit: ${RATE_LIMIT_MESSAGES} messages per hour. Please try again later.`,
            ErrorCode.RATE_LIMIT_EXCEEDED
        );
    }
}

// ─── OpenAI Integration ─────────────────────────────────────────

/**
 * Send a message to GPT-4o and get a response.
 */
async function callGPT4(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!config.openaiApiKey) {
        log.warn('OpenAI API key not configured');
        return 'I am currently unavailable. The AI service is not configured. Please contact support.';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 800,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0.1,
            presence_penalty: 0.1,
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        log.error({ status: response.status, error: errorData }, 'OpenAI API error');
        throw new AppError('AI service temporarily unavailable', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new AppError('Empty response from AI service', 500, ErrorCode.SERVER_ERROR);
    }

    return content;
}

// ─── Context Building ───────────────────────────────────────────

/**
 * Build context about the user for the AI.
 */
async function buildUserContext(userId: string): Promise<string> {
    const parts: string[] = [];

    // Fetch user's latest workout stats
    try {
        const { rows: workoutRows } = await db.query(
            `
            SELECT exercise_type, overall_score, created_at
            FROM mediapipe_analyses
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 3
            `,
            [userId]
        );
        if (workoutRows.length > 0) {
            parts.push('Recent form analyses: ' + workoutRows.map(
                (r) => `${r.exercise_type} (score: ${r.overall_score})`
            ).join(', '));
        }
    } catch {
        // Table may not exist yet
    }

    // Fetch latest wearable metrics
    try {
        const { rows: wearableRows } = await db.query(
            `
            SELECT steps, calories_burned, sleep_hours, metric_date
            FROM wearable_health_metrics m
            JOIN wearable_connections c ON m.connection_id = c.id
            WHERE c.user_id = $1
            ORDER BY m.metric_date DESC
            LIMIT 1
            `,
            [userId]
        );
        if (wearableRows.length > 0) {
            const w = wearableRows[0];
            parts.push(`Latest daily stats: ${w.steps} steps, ${w.calories_burned} cal, ${w.sleep_hours}h sleep`);
        }
    } catch {
        // Table may not exist yet
    }

    return parts.length > 0 ? `\n\nUser context:\n${parts.join('\n')}` : '';
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Send a chat message and get an AI response.
 */
export async function sendMessage(
    userId: string,
    content: string,
    conversationId?: string
): Promise<ChatResponse> {
    await checkRateLimit(userId);

    // Get or create conversation
    let conversation: ChatConversation;
    if (conversationId) {
        const existing = await getConversationById(conversationId);
        if (!existing || existing.userId !== userId) {
            throw new NotFoundError('Conversation not found', ErrorCode.NOT_FOUND_RESOURCE);
        }
        conversation = existing;
    } else {
        conversation = await createConversation(userId, content.slice(0, 50));
    }

    // Store user message
    await db.query(
        `
        INSERT INTO chatbot_conversations (conversation_id, role, content, metadata)
        VALUES ($1, 'user', $2, NULL)
        `,
        [conversation.id, content]
    );

    // Get conversation history (last 20 messages)
    const { rows: historyRows } = await db.query(
        `
        SELECT role, content
        FROM chatbot_conversations
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT 20
        `,
        [conversation.id]
    );

    const history = historyRows.reverse().map((r) => ({
        role: r.role,
        content: r.content,
    }));

    // Build user context
    const userContext = await buildUserContext(userId);

    // Prepare messages for GPT-4
    const messages = [
        { role: 'system', content: FITNESS_SYSTEM_PROMPT + userContext },
        ...history,
    ];

    const startTime = Date.now();
    const aiContent = await callGPT4(messages);
    const responseTimeMs = Date.now() - startTime;

    // Store assistant response
    const { rows: assistantRows } = await db.query(
        `
        INSERT INTO chatbot_conversations (conversation_id, role, content, metadata)
        VALUES ($1, 'assistant', $2, $3)
        RETURNING id, created_at as "createdAt"
        `,
        [
            conversation.id,
            aiContent,
            JSON.stringify({ responseTimeMs, model: 'gpt-4o-mini' }),
        ]
    );

    // Update conversation timestamp
    await db.query(
        `UPDATE chatbot_chats SET updated_at = NOW() WHERE id = $1`,
        [conversation.id]
    );

    const message: ChatMessage = {
        id: String(assistantRows[0].id),
        conversationId: conversation.id,
        role: 'assistant',
        content: aiContent,
        metadata: { responseTimeMs, model: 'gpt-4o-mini' },
        createdAt: new Date(assistantRows[0].createdAt),
    };

    // Extract suggestions from the response
    const suggestions = extractSuggestions(aiContent);

    log.info({ conversationId: conversation.id, userId, responseTimeMs }, 'Chat message processed');

    return {
        message,
        conversationId: conversation.id,
        suggestions,
    };
}

/**
 * Get messages in a conversation.
 */
export async function getConversationMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ messages: ChatMessage[]; total: number }> {
    // Verify ownership
    const { rows: convRows } = await db.query(
        `SELECT user_id FROM chatbot_chats WHERE id = $1`,
        [conversationId]
    );

    if (convRows.length === 0) {
        throw new NotFoundError('Conversation not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    if (String(convRows[0].user_id) !== userId) {
        throw new ValidationError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM chatbot_conversations WHERE conversation_id = $1`,
        [conversationId]
    );

    const { rows } = await db.query(
        `
        SELECT id, conversation_id as "conversationId", role, content,
               metadata, created_at as "createdAt"
        FROM chatbot_conversations
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
        `,
        [conversationId, limit, offset]
    );

    const messages: ChatMessage[] = rows.map((row) => ({
        id: String(row.id),
        conversationId: String(row.conversationId),
        role: row.role,
        content: row.content,
        metadata: row.metadata,
        createdAt: new Date(row.createdAt),
    }));

    return {
        messages,
        total: parseInt(countRows[0].total),
    };
}

/**
 * List conversations for a user.
 */
export async function listConversations(
    filters: ConversationFilters
): Promise<{ conversations: ChatConversation[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
    }
    if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query(
        `SELECT COUNT(*) as total FROM chatbot_chats ${whereClause}`,
        params
    );

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", title, status,
               (SELECT COUNT(*) FROM chatbot_conversations WHERE conversation_id = chatbot_chats.id) as "messageCount",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM chatbot_chats
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        [...params, limit, offset]
    );

    const conversations: ChatConversation[] = rows.map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        title: row.title,
        status: row.status,
        messageCount: parseInt(row.messageCount),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    }));

    return { conversations, total: parseInt(countRows[0].total) };
}

/**
 * Delete (soft-delete) a conversation.
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
    const { rows } = await db.query(
        `SELECT user_id FROM chatbot_chats WHERE id = $1`,
        [conversationId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Conversation not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    if (String(rows[0].user_id) !== userId) {
        throw new ValidationError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    await db.query(
        `UPDATE chatbot_chats SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
        [conversationId]
    );

    log.info({ conversationId, userId }, 'Conversation deleted');
}

// ─── Helpers ────────────────────────────────────────────────────

async function createConversation(userId: string, title?: string): Promise<ChatConversation> {
    const { rows } = await db.query(
        `
        INSERT INTO chatbot_chats (user_id, title, status)
        VALUES ($1, $2, 'active')
        RETURNING id, user_id as "userId", title, status, created_at as "createdAt", updated_at as "updatedAt"
        `,
        [userId, title || 'New Chat']
    );

    const row = rows[0];
    return {
        id: String(row.id),
        userId: String(row.userId),
        title: row.title,
        status: row.status,
        messageCount: 0,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}

async function getConversationById(conversationId: string): Promise<ChatConversation | null> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", title, status,
               (SELECT COUNT(*) FROM chatbot_conversations WHERE conversation_id = chatbot_chats.id) as "messageCount",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM chatbot_chats
        WHERE id = $1
        `,
        [conversationId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        id: String(row.id),
        userId: String(row.userId),
        title: row.title,
        status: row.status,
        messageCount: parseInt(row.messageCount),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}

function extractSuggestions(aiResponse: string): string[] {
    const suggestions: string[] = [];

    // Look for list items or suggestions in the response
    const lines = aiResponse.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (
            trimmed.match(/^\d+\./) ||
            trimmed.match(/^[-*]\s/) ||
            trimmed.match(/^(Try|Consider|You could|Maybe|How about|What about)/i)
        ) {
            const clean = trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
            if (clean.length > 10 && clean.length < 100) {
                suggestions.push(clean);
            }
        }
    }

    return suggestions.slice(0, 3);
}
