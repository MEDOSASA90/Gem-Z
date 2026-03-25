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
                SELECT * FROM chat_messages
                WHERE (sender_id = $1 AND receiver_id = $2)
                   OR (sender_id = $2 AND receiver_id = $1)
                ORDER BY created_at ASC
                LIMIT 100
            `, [userId, contactId]);

            // Mark unread messages as read
            await db.query(`
                UPDATE chat_messages 
                SET is_read = TRUE 
                WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE
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
                SELECT DISTINCT u.id, u.full_name, u.role, u.profile_pic
                FROM users u
                JOIN chat_messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
                WHERE (m.sender_id = $1 OR m.receiver_id = $1)
                AND u.id != $1
            `, [userId]);

            return res.status(200).json({ success: true, contacts: rows });
        } catch (error) {
            console.error('[ChatController] getContacts Error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
}
