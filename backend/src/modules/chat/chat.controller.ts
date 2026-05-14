import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export class ChatController {
    
    /**
     * GET /api/v1/chat/history/:contactId
     * Fetch conversation history between current user and contact ID
     */
    static async getHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const contactId = req.params.contactId;

            if (!userId || !contactId) return res.status(400).json({ success: false, message: 'Invalid request' });

            const { rows } = await db.query(`
                SELECT m.*
                FROM chat_messages m
                JOIN chat_rooms r ON r.id = m.room_id
                WHERE (
                    (r.participant_one = $1 AND r.participant_two = $2)
                    OR (r.participant_one = $2 AND r.participant_two = $1)
                )
                ORDER BY m.created_at ASC
                LIMIT 100
            `, [userId, contactId]);

            // Mark unread messages as read
            await db.query(`
                UPDATE chat_messages m
                SET is_read = TRUE
                FROM chat_rooms r
                WHERE m.room_id = r.id
                  AND m.sender_id = $2
                  AND m.is_read = FALSE
                  AND (
                    (r.participant_one = $1 AND r.participant_two = $2)
                    OR (r.participant_one = $2 AND r.participant_two = $1)
                  )
            `, [userId, contactId]);

            return res.status(200).json({ success: true, messages: rows });
        } catch (error) {
            console.error('[ChatController] getHistory Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    /**
     * GET /api/v1/chat/contacts
     * Gets a list of recent contacts / active chats
     */
    static async getContacts(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            // Simple distinct contacts who messaged us or we messaged them
            const { rows } = await db.query(`
                SELECT DISTINCT u.id, u.full_name, u.role, u.avatar_url
                FROM users u
                JOIN chat_rooms r ON (u.id = r.participant_one OR u.id = r.participant_two)
                WHERE (r.participant_one = $1 OR r.participant_two = $1)
                  AND u.id != $1
            `, [userId]);

            return res.status(200).json({ success: true, contacts: rows });
        } catch (error) {
            console.error('[ChatController] getContacts Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
}
