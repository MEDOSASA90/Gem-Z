import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export class SocialController {
    static async getFeed(req: AuthRequest, res: Response) {
        try {
            return res.status(200).json({ success: true, posts: [] });
        } catch (error) {
            console.error('[SocialController] getFeed:', error);
            res.status(500).json({ success: false, message: 'Failed to load feed' });
        }
    }

    static async createPost(req: AuthRequest, res: Response) {
        const { content, mediaUrl } = req.body;
        const authorId = req.user!.userId;

        try {
            return res.status(201).json({ success: true, post: { id: 'mock-post-id', content, mediaUrl, created_at: new Date() } });
        } catch (error) {
            console.error('[SocialController] createPost:', error);
            res.status(500).json({ success: false, message: 'Failed to create post' });
        }
    }
}
