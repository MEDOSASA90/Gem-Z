/**
 * GEM Z — Squad Routes
 *
 * Routes:
 *   POST   /api/v1/squads              — Create squad
 *   GET    /api/v1/squads               — List squads
 *   GET    /api/v1/squads/:id           — Get squad details
 *   POST   /api/v1/squads/:id/join      — Join squad
 *   POST   /api/v1/squads/:id/leave     — Leave squad
 *   DELETE /api/v1/squads/:id           — Delete squad (owner only)
 *   PUT    /api/v1/squads/:id           — Update squad (owner only)
 *   GET    /api/v1/squads/:id/members   — List members
 *   POST   /api/v1/squads/:id/kick/:userId — Kick member (owner only)
 */

import express, { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { SquadService } from './squad.service';
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
const squadService = new SquadService(db);
const log = createLogger('squad-routes');

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

// ─── Squad CRUD ─────────────────────────────────────────────────

router.post('/', auth,
    validate([
        body('name').trim().notEmpty().withMessage('Squad name is required').isLength({ max: 100 }).withMessage('Max 100 characters'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Max 500 characters'),
        body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
        body('avatarUrl').optional().isURL().withMessage('avatarUrl must be a valid URL'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const creatorId = req.user!.userId;
            const { name, description, isPublic, avatarUrl } = req.body;

            const squad = await squadService.createSquad(creatorId, { name, description, isPublic, avatarUrl });
            res.status(201).json(success(squad, 'Squad created'));
        } catch (error) {
            next(error);
        }
    }
);

router.get('/', auth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const squads = await squadService.listSquads(userId);
        res.status(200).json(success(squads, 'Squads retrieved'));
    } catch (error) {
        next(error);
    }
});

router.get('/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const userId = req.user!.userId;

            const squad = await squadService.getSquadDetails(squadId, userId);
            res.status(200).json(success(squad, 'Squad details retrieved'));
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
        body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
        body('description').optional().trim().isLength({ max: 500 }),
        body('isPublic').optional().isBoolean(),
        body('avatarUrl').optional().isURL(),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const userId = req.user!.userId;
            const { name, description, isPublic, avatarUrl } = req.body;

            const squad = await squadService.updateSquad(squadId, userId, { name, description, isPublic, avatarUrl });
            res.status(200).json(success(squad, 'Squad updated'));
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const userId = req.user!.userId;

            await squadService.deleteSquad(squadId, userId);
            res.status(200).json(success(null, 'Squad deleted'));
        } catch (error) {
            next(error);
        }
    }
);

// ─── Member Management ──────────────────────────────────────────

router.post('/:id/join', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const userId = req.user!.userId;

            await squadService.joinSquad(squadId, userId);
            res.status(200).json(success(null, 'Joined squad'));
        } catch (error) {
            next(error);
        }
    }
);

router.post('/:id/leave', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const userId = req.user!.userId;

            await squadService.leaveSquad(squadId, userId);
            res.status(200).json(success(null, 'Left squad'));
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id/members', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const members = await squadService.listMembers(squadId);
            res.status(200).json(success(members, 'Members retrieved'));
        } catch (error) {
            next(error);
        }
    }
);

router.post('/:id/kick/:userId', auth,
    validate([
        param('id').isUUID().withMessage('Invalid squad ID'),
        param('userId').isUUID().withMessage('Invalid user ID'),
    ]),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const squadId = req.params.id;
            const ownerId = req.user!.userId;
            const targetUserId = req.params.userId;

            await squadService.kickMember(squadId, ownerId, targetUserId);
            res.status(200).json(success(null, 'Member kicked'));
        } catch (error) {
            next(error);
        }
    }
);

export default router;
