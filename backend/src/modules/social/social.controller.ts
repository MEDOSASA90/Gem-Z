import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export class SocialController {
    static async getFeed(req: AuthRequest, res: Response) {
        try {
            const result = await db.query(`
                SELECT p.id, p.content, p.media_urls, p.likes_count, p.comments_count, p.created_at,
                       u.full_name as author_name, u.role as author_role
                FROM posts p
                JOIN users u ON p.author_id = u.id
                ORDER BY p.created_at DESC
                LIMIT 50
            `);
            
            return res.status(200).json({ success: true, posts: result.rows });
        } catch (error) {
            console.error('[SocialController] getFeed:', error);
            return res.status(500).json({ success: false, message: 'Failed to load feed' });
        }
    }

    static async createPost(req: AuthRequest, res: Response) {
        const { content, mediaUrl } = req.body;
        const authorId = req.user?.userId;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        try {
            const mediaArray = mediaUrl ? [mediaUrl] : [];
            const result = await db.query(
                `INSERT INTO posts (author_id, content, media_urls) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [authorId, content, mediaArray]
            );

            // Fetch author name to return complete object
            const userRes = await db.query(`SELECT full_name, role FROM users WHERE id = $1`, [authorId]);
            const author = userRes.rows[0];

            const newPost = {
                ...result.rows[0],
                author_name: author.full_name,
                author_role: author.role
            };

            return res.status(201).json({ success: true, post: newPost });
        } catch (error) {
            console.error('[SocialController] createPost:', error);
            return res.status(500).json({ success: false, message: 'Failed to create post' });
        }
    }
}

