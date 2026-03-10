import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

const pool = new Pool();

export class SocialController {

    /**
     * GET /api/v1/social/feed
     */
    static async getFeed(req: AuthRequest, res: Response) {
        try {
            const feedRes = await pool.query(`
                SELECT p.*, u.full_name as author_name, u.role as author_role,
                       (SELECT COUNT(*) FROM social_comments c WHERE c.post_id = p.id) as comment_count,
                       EXISTS(SELECT 1 FROM social_likes l WHERE l.post_id = p.id AND l.user_id = $1) as is_liked
                FROM social_posts p
                JOIN users u ON p.author_id = u.id
                ORDER BY p.created_at DESC
                LIMIT 30
            `, [req.user!.userId]);

            return res.status(200).json({ success: true, posts: feedRes.rows });
        } catch (error) {
            console.error('[SocialController] getFeed:', error);
            res.status(500).json({ success: false, message: 'Failed to load feed' });
        }
    }

    /**
     * POST /api/v1/social/posts
     */
    static async createPost(req: AuthRequest, res: Response) {
        const { content, mediaUrl } = req.body;
        const authorId = req.user!.userId;

        try {
            const newPost = await pool.query(`
                INSERT INTO social_posts (author_id, content, media_url)
                VALUES ($1, $2, $3)
                RETURNING id, content, created_at
            `, [authorId, content, mediaUrl || null]);

            return res.status(201).json({ success: true, post: newPost.rows[0] });
        } catch (error) {
            console.error('[SocialController] createPost:', error);
            res.status(500).json({ success: false, message: 'Failed to create post' });
        }
    }
}
