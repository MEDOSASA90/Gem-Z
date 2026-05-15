/**
 * GEM Z — In-App Chat Service
 *
 * Real-time chat with Socket.IO integration.
 * Features:
 *   - Send/receive messages
 *   - Conversation management
 *   - Read receipts
 *   - Typing indicators
 *   - Message history with pagination
 *   - Unread counts
 */

import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ServerError,
    ErrorCode,
} from '../../core/errors';
import { redisClient } from '../../core/redis/client';

const log = createLogger('chat');

// ─── Types ──────────────────────────────────────────────────────

export interface Conversation {
    id: string;
    participantOne: string;
    participantTwo: string;
    lastMessageAt: Date;
    createdAt: Date;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    messageType: 'text' | 'image' | 'voice' | 'file';
    fileUrl?: string;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
}

export interface SendMessageInput {
    senderId: string;
    receiverId: string;
    content: string;
    messageType?: 'text' | 'image' | 'voice' | 'file';
    fileUrl?: string;
}

export interface MessageHistoryOptions {
    roomId: string;
    userId: string;
    page?: number;
    limit?: number;
}

export interface PaginatedMessages {
    messages: ChatMessage[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ConversationWithDetails extends Conversation {
    otherParticipant: {
        id: string;
        fullName: string;
        avatarUrl?: string;
    };
    lastMessage?: {
        content: string;
        senderId: string;
        createdAt: Date;
    };
    unreadCount: number;
}

export interface TypingEvent {
    roomId: string;
    userId: string;
    isTyping: boolean;
}

// ─── Service ────────────────────────────────────────────────────

/**
 * Send a message between two users.
 * Creates a conversation room if one doesn't exist.
 *
 * @param input - Message input data
 * @returns The created message
 */
export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
    const { senderId, receiverId, content, messageType = 'text', fileUrl } = input;

    if (!content || content.trim().length === 0) {
        throw new ValidationError('Message content is required', ErrorCode.INVALID_INPUT);
    }

    if (!receiverId) {
        throw new ValidationError('Receiver ID is required', ErrorCode.INVALID_INPUT);
    }

    if (senderId === receiverId) {
        throw new ValidationError('Cannot send message to yourself', ErrorCode.INVALID_INPUT);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Get or create conversation room
        const participants = [senderId, receiverId].sort();
        const roomResult = await client.query(
            `INSERT INTO chat_conversations (participant_one, participant_two)
             VALUES ($1, $2)
             ON CONFLICT (participant_one, participant_two)
             DO UPDATE SET last_message_at = NOW()
             RETURNING id, participant_one, participant_two`,
            [participants[0], participants[1]]
        );

        const roomId = roomResult.rows[0].id;

        // Insert message
        const messageResult = await client.query(
            `INSERT INTO chat_messages (room_id, sender_id, receiver_id, content, message_type, file_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, room_id, sender_id, receiver_id, content, message_type, file_url, is_read, read_at, created_at`,
            [roomId, senderId, receiverId, content.trim(), messageType, fileUrl || null]
        );

        // Update conversation last_message_at
        await client.query(
            `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
            [roomId]
        );

        // Cache unread count for receiver
        await redisClient.incr(`chat:unread:${receiverId}:${roomId}`);
        await redisClient.expire(`chat:unread:${receiverId}:${roomId}`, 86400 * 7);

        await client.query('COMMIT');

        const row = messageResult.rows[0];
        const message: ChatMessage = {
            id: row.id,
            roomId: row.room_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            content: row.content,
            messageType: row.message_type,
            fileUrl: row.file_url,
            isRead: row.is_read,
            readAt: row.read_at,
            createdAt: row.created_at,
        };

        log.info({ messageId: message.id, senderId, receiverId }, 'Message sent');
        return message;
    } catch (error) {
        await client.query('ROLLBACK');
        log.error({ error: (error as Error).message, senderId, receiverId }, 'Failed to send message');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to send message', ErrorCode.SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Get message history for a conversation with pagination.
 *
 * @param options - Pagination and filter options
 * @returns Paginated messages
 */
export async function getMessageHistory(options: MessageHistoryOptions): Promise<PaginatedMessages> {
    const { roomId, userId, page = 1, limit = 50 } = options;

    // Verify user is part of this conversation
    const accessCheck = await db.query(
        `SELECT id FROM chat_conversations
         WHERE id = $1 AND (participant_one = $2 OR participant_two = $2)`,
        [roomId, userId]
    );

    if (accessCheck.rowCount === 0) {
        throw new NotFoundError('Conversation not found or access denied', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const offset = (page - 1) * limit;

    try {
        const [messagesResult, countResult] = await Promise.all([
            db.query(
                `SELECT id, room_id, sender_id, receiver_id, content, message_type, file_url,
                        is_read, read_at, created_at
                 FROM chat_messages
                 WHERE room_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
                [roomId, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) as total FROM chat_messages WHERE room_id = $1`,
                [roomId]
            ),
        ]);

        const total = Number(countResult.rows[0].total);
        const messages: ChatMessage[] = messagesResult.rows.map(row => ({
            id: row.id,
            roomId: row.room_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            content: row.content,
            messageType: row.message_type,
            fileUrl: row.file_url,
            isRead: row.is_read,
            readAt: row.read_at,
            createdAt: row.created_at,
        }));

        // Mark messages as read for this user
        await markMessagesAsRead(roomId, userId);

        // Clear cached unread count
        await redisClient.del(`chat:unread:${userId}:${roomId}`);

        return {
            messages: messages.reverse(), // Oldest first
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    } catch (error) {
        log.error({ error: (error as Error).message, roomId, userId }, 'Failed to get message history');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to retrieve messages', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Mark all messages in a conversation as read for a user.
 *
 * @param roomId - Conversation room ID
 * @param userId - User marking as read
 */
export async function markMessagesAsRead(roomId: string, userId: string): Promise<number> {
    try {
        const result = await db.query(
            `UPDATE chat_messages
             SET is_read = TRUE, read_at = NOW()
             WHERE room_id = $1 AND receiver_id = $2 AND is_read = FALSE
             RETURNING id`,
            [roomId, userId]
        );

        const count = result.rowCount || 0;

        if (count > 0) {
            // Clear unread cache
            await redisClient.del(`chat:unread:${userId}:${roomId}`);
            log.info({ roomId, userId, markedCount: count }, 'Messages marked as read');
        }

        return count;
    } catch (error) {
        log.error({ error: (error as Error).message, roomId, userId }, 'Failed to mark messages as read');
        return 0;
    }
}

/**
 * Get all conversations for a user with last message preview.
 *
 * @param userId - User ID
 * @returns Array of conversations with details
 */
export async function getConversations(userId: string): Promise<ConversationWithDetails[]> {
    try {
        const result = await db.query(
            `SELECT
                cc.id,
                cc.participant_one,
                cc.participant_two,
                cc.last_message_at,
                cc.created_at,
                u.id as other_id,
                u.full_name as other_name,
                u.avatar_url as other_avatar,
                lm.content as last_content,
                lm.sender_id as last_sender_id,
                lm.created_at as last_created_at
             FROM chat_conversations cc
             JOIN users u ON u.id = CASE
                 WHEN cc.participant_one = $1 THEN cc.participant_two
                 ELSE cc.participant_one
             END
             LEFT JOIN LATERAL (
                 SELECT content, sender_id, created_at
                 FROM chat_messages
                 WHERE room_id = cc.id
                 ORDER BY created_at DESC
                 LIMIT 1
             ) lm ON TRUE
             WHERE cc.participant_one = $1 OR cc.participant_two = $1
             ORDER BY cc.last_message_at DESC`,
            [userId]
        );

        const conversations: ConversationWithDetails[] = [];

        for (const row of result.rows) {
            const unreadResult = await db.query(
                `SELECT COUNT(*) as count FROM chat_messages
                 WHERE room_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
                [row.id, userId]
            );

            conversations.push({
                id: row.id,
                participantOne: row.participant_one,
                participantTwo: row.participant_two,
                lastMessageAt: row.last_message_at,
                createdAt: row.created_at,
                otherParticipant: {
                    id: row.other_id,
                    fullName: row.other_name,
                    avatarUrl: row.other_avatar,
                },
                lastMessage: row.last_content
                    ? {
                          content: row.last_content,
                          senderId: row.last_sender_id,
                          createdAt: row.last_created_at,
                      }
                    : undefined,
                unreadCount: Number(unreadResult.rows[0].count),
            });
        }

        return conversations;
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to get conversations');
        if (error instanceof AppError) throw error;
        throw new ServerError('Failed to retrieve conversations', ErrorCode.SERVER_ERROR);
    }
}

/**
 * Get a single conversation by ID.
 *
 * @param roomId - Room ID
 * @param userId - Requesting user ID
 */
export async function getConversation(roomId: string, userId: string): Promise<ConversationWithDetails> {
    const result = await db.query(
        `SELECT
            cc.id,
            cc.participant_one,
            cc.participant_two,
            cc.last_message_at,
            cc.created_at,
            u.id as other_id,
            u.full_name as other_name,
            u.avatar_url as other_avatar,
            lm.content as last_content,
            lm.sender_id as last_sender_id,
            lm.created_at as last_created_at
         FROM chat_conversations cc
         JOIN users u ON u.id = CASE
             WHEN cc.participant_one = $1 THEN cc.participant_two
             ELSE cc.participant_one
         END
         LEFT JOIN LATERAL (
             SELECT content, sender_id, created_at
             FROM chat_messages
             WHERE room_id = cc.id
             ORDER BY created_at DESC
             LIMIT 1
         ) lm ON TRUE
         WHERE cc.id = $2 AND (cc.participant_one = $1 OR cc.participant_two = $1)`,
        [userId, roomId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Conversation not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const row = result.rows[0];

    const unreadResult = await db.query(
        `SELECT COUNT(*) as count FROM chat_messages
         WHERE room_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
        [roomId, userId]
    );

    return {
        id: row.id,
        participantOne: row.participant_one,
        participantTwo: row.participant_two,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        otherParticipant: {
            id: row.other_id,
            fullName: row.other_name,
            avatarUrl: row.other_avatar,
        },
        lastMessage: row.last_content
            ? {
                  content: row.last_content,
                  senderId: row.last_sender_id,
                  createdAt: row.last_created_at,
              }
            : undefined,
        unreadCount: Number(unreadResult.rows[0].count),
    };
}

/**
 * Get total unread message count for a user.
 *
 * @param userId - User ID
 * @returns Total unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        // Try cache first
        const cached = await redisClient.get(`chat:unread:total:${userId}`);
        if (cached) {
            return Number(cached);
        }

        const result = await db.query(
            `SELECT COUNT(*) as count FROM chat_messages
             WHERE receiver_id = $1 AND is_read = FALSE`,
            [userId]
        );

        const count = Number(result.rows[0].count);

        // Cache for 5 minutes
        await redisClient.setex(`chat:unread:total:${userId}`, 300, String(count));

        return count;
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to get unread count');
        return 0;
    }
}

/**
 * Delete a conversation and all its messages.
 *
 * @param roomId - Room ID
 * @param userId - User requesting deletion (must be a participant)
 */
export async function deleteConversation(roomId: string, userId: string): Promise<void> {
    const accessCheck = await db.query(
        `SELECT id FROM chat_conversations
         WHERE id = $1 AND (participant_one = $2 OR participant_two = $2)`,
        [roomId, userId]
    );

    if (accessCheck.rowCount === 0) {
        throw new NotFoundError('Conversation not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Delete messages first (foreign key constraint)
        await client.query(`DELETE FROM chat_messages WHERE room_id = $1`, [roomId]);

        // Delete conversation
        await client.query(`DELETE FROM chat_conversations WHERE id = $1`, [roomId]);

        // Clear caches
        const otherId =
            accessCheck.rows[0].participant_one === userId
                ? accessCheck.rows[0].participant_two
                : accessCheck.rows[0].participant_one;

        await redisClient.del(`chat:unread:${userId}:${roomId}`);
        await redisClient.del(`chat:unread:${otherId}:${roomId}`);
        await redisClient.del(`chat:unread:total:${userId}`);
        await redisClient.del(`chat:unread:total:${otherId}`);

        await client.query('COMMIT');

        log.info({ roomId, userId }, 'Conversation deleted');
    } catch (error) {
        await client.query('ROLLBACK');
        log.error({ error: (error as Error).message, roomId, userId }, 'Failed to delete conversation');
        throw new ServerError('Failed to delete conversation', ErrorCode.SERVER_ERROR);
    } finally {
        client.release();
    }
}

/**
 * Set typing indicator for a user in a conversation.
 *
 * @param event - Typing event data
 */
export async function setTypingStatus(event: TypingEvent): Promise<void> {
    try {
        const key = `chat:typing:${event.roomId}`;
        if (event.isTyping) {
            await redisClient.hset(key, event.userId, String(Date.now()));
            await redisClient.expire(key, 30);
        } else {
            await redisClient.hdel(key, event.userId);
        }
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to set typing status');
    }
}

/**
 * Get typing users in a conversation.
 *
 * @param roomId - Room ID
 * @param excludeUserId - User to exclude from results
 * @returns Array of typing user IDs
 */
export async function getTypingUsers(roomId: string, excludeUserId?: string): Promise<string[]> {
    try {
        const key = `chat:typing:${roomId}`;
        const entries = await redisClient.hgetall(key);
        const now = Date.now();
        const typingUsers: string[] = [];

        for (const [userId, timestamp] of Object.entries(entries)) {
            // Expire entries older than 10 seconds
            if (now - Number(timestamp) > 10000) {
                await redisClient.hdel(key, userId);
            } else if (userId !== excludeUserId) {
                typingUsers.push(userId);
            }
        }

        return typingUsers;
    } catch (error) {
        return [];
    }
}

// ─── Socket.IO Event Handlers ───────────────────────────────────

/**
 * Handle socket message sending.
 * This is called from the Socket.IO connection handler.
 */
export async function handleSocketMessage(
    senderId: string,
    data: { receiverId: string; content: string; messageType?: string; fileUrl?: string }
): Promise<ChatMessage | null> {
    try {
        const message = await sendMessage({
            senderId,
            receiverId: data.receiverId,
            content: data.content,
            messageType: (data.messageType as any) || 'text',
            fileUrl: data.fileUrl,
        });
        return message;
    } catch (error) {
        log.error({ error: (error as Error).message, senderId }, 'Socket message handler error');
        return null;
    }
}

/**
 * Handle socket read receipts.
 */
export async function handleSocketRead(
    userId: string,
    data: { roomId: string }
): Promise<number> {
    return markMessagesAsRead(data.roomId, userId);
}
