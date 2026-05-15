/**
 * GEM Z — Social Routes
 *
 * Routes:
 *   GET  /api/v1/social/feed          — Get social feed
 *   POST /api/v1/social/posts         — Create post
 *   PUT  /api/v1/social/posts/:id     — Update post
 *   DELETE /api/v1/social/posts/:id   — Delete post
 *   POST /api/v1/social/posts/:id/like     — Like/unlike post
 *   POST /api/v1/social/posts/:id/comment  — Add comment
 *   DELETE /api/v1/social/comments/:id     — Delete comment
 *   GET  /api/v1/social/buddy-match   — Find workout buddy
 *   POST /api/v1/social/follow/:userId     — Follow user
 *   DELETE /api/v1/social/follow/:userId   — Unfollow user
 *   GET  /api/v1/social/followers     — Get followers
 *   GET  /api/v1/social/following     — Get following
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { SocialService } from './social.service';
import { db } from '../../core/database/db';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ErrorCode,
    buildErrorResponse,
} from '../../core/errors';
import { success } from '../../core/utils/api-response';

const router = express.Router();
const socialService = new SocialService(db);
const log = createLogger('social-routes');

const auth = authenticate as any;

// ─── Validation Helpers ─────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            const fields: Record<string, string> = {};
            errors.array().forEach((err: any) => {
                fields[err.path || err.param] = err.msg;
            });
            return next(new ValidationError('Validation failed', ErrorCode.VALIDATION_ERROR, fields));
        }
        next();
    };
};

// ─── Feed ───────────────────────────────────────────────────────

router.get('/feed', auth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const offset = Number(req.query.offset) || 0;

        const posts = await socialService.getFeed(userId, limit, offset);
        res.status(200).json(success(posts, 'Feed loaded'));
    } catch (error) {
        next(error);
    }
});

// ─── Posts ──────────────────────────────────────────────────────

router.post('/posts', auth,
    validate([
        body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 5000 }).withMessage('Max 5000 characters'),
        body('mediaUrl').optional().isURL().withMessage('mediaUrl must be a valid URL'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { content, mediaUrl } = req.body;
            const authorId = req.user!.userId;
            const mediaUrls = mediaUrl ? [mediaUrl] : [];

            const post = await socialService.createPost(authorId, content, mediaUrls);
            res.status(201).json(success(post, 'Post created'));
        } catch (error) {
            next(error);
        }
    }
);

router.put('/posts/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid post ID'),
        body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 5000 }).withMessage('Max 5000 characters'),
        body('mediaUrls').optional().isArray().withMessage('mediaUrls must be an array'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const postId = req.params.id;
            const userId = req.user!.userId;
            const { content, mediaUrls } = req.body;

            const post = await socialService.updatePost(postId, userId, content, mediaUrls);
            res.status(200).json(success(post, 'Post updated'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/posts/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid post ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const postId = req.params.id;
            const userId = req.user!.userId;

            await socialService.deletePost(postId, userId);
            res.status(200).json(success(null, 'Post deleted'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Likes ──────────────────────────────────────────────────────

router.post('/posts/:id/like', auth,
    validate([
        param('id').isUUID().withMessage('Invalid post ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const postId = req.params.id;
            const userId = req.user!.userId;

            const result = await socialService.toggleLike(postId, userId);
            res.status(200).json(success(result, result.liked ? 'Post liked' : 'Post unliked'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Comments ───────────────────────────────────────────────────

router.post('/posts/:id/comment', auth,
    validate([
        param('id').isUUID().withMessage('Invalid post ID'),
        body('content').trim().notEmpty().withMessage('Comment content is required').isLength({ max: 2000 }).withMessage('Max 2000 characters'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const postId = req.params.id;
            const userId = req.user!.userId;
            const { content } = req.body;

            const comment = await socialService.addComment(postId, userId, content);
            res.status(201).json(success(comment, 'Comment added'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/comments/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid comment ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const commentId = req.params.id;
            const userId = req.user!.userId;

            await socialService.deleteComment(commentId, userId);
            res.status(200).json(success(null, 'Comment deleted'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Buddy Matching ─────────────────────────────────────────────

router.get('/buddy-match', auth,
    validate([
        query('gymId').optional().isUUID().withMessage('Invalid gym ID'),
        query('goal').optional().trim().isLength({ max: 100 }).withMessage('Goal too long'),
        query('preferredTime').optional().trim().isLength({ max: 50 }).withMessage('Time preference too long'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const { gymId, goal, preferredTime } = req.query;

            const matches = await socialService.findWorkoutBuddies(userId, {
                gymId: gymId as string | undefined,
                goal: goal as string | undefined,
                preferredTime: preferredTime as string | undefined,
            });

            res.status(200).json(success(matches, 'Buddy matches found'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Follow / Unfollow ──────────────────────────────────────────

router.post('/follow/:userId', auth,
    validate([
        param('userId').isUUID().withMessage('Invalid user ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const followerId = req.user!.userId;
            const followingId = req.params.userId;

            await socialService.followUser(followerId, followingId);
            res.status(200).json(success(null, 'User followed'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/follow/:userId', auth,
    validate([
        param('userId').isUUID().withMessage('Invalid user ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const followerId = req.user!.userId;
            const followingId = req.params.userId;

            await socialService.unfollowUser(followerId, followingId);
            res.status(200).json(success(null, 'User unfollowed'));
        } catch (error) {
            next(error);
        }
    }
);

router.get('/followers', auth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const followers = await socialService.getFollowers(userId);
        res.status(200).json(success(followers, 'Followers retrieved'));
    } catch (error) {
        next(error);
    }
});

router.get('/following', auth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const following = await socialService.getFollowing(userId);
        res.status(200).json(success(following, 'Following retrieved'));
    } catch (error) {
        next(error);
    }
});

export default router;
