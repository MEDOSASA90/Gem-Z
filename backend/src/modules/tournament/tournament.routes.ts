/**
 * GEM Z — Tournament Routes
 *
 * Routes:
 *   POST   /api/v1/tournaments              — Create tournament
 *   GET    /api/v1/tournaments               — List tournaments (with filters)
 *   GET    /api/v1/tournaments/:id           — Get tournament details
 *   PUT    /api/v1/tournaments/:id           — Update tournament (creator only)
 *   DELETE /api/v1/tournaments/:id           — Delete tournament (creator only)
 *   POST   /api/v1/tournaments/:id/join      — Join tournament
 *   POST   /api/v1/tournaments/:id/leave     — Leave tournament
 *   POST   /api/v1/tournaments/:id/score     — Update score
 *   GET    /api/v1/tournaments/:id/leaderboard — Get leaderboard
 *   GET    /api/v1/tournaments/:id/standing  — Get current user's standing
 */

import express, { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { TournamentController } from './tournament.controller';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/errors';

const router = express.Router();
const log = createLogger('tournament-routes');

const auth = authenticate as any;

// ─── Validation Helpers ─────────────────────────────────────────

const validate = (validations: any[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
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

// ─── Tournament CRUD ────────────────────────────────────────────

router.post(
    '/',
    auth,
    validate([
        body('name').trim().notEmpty().withMessage('Tournament name is required').isLength({ max: 200 }),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('type').isIn(['individual', 'squad', 'corporate']).withMessage('Type must be: individual, squad, corporate'),
        body('startDate').isISO8601().withMessage('startDate must be a valid date'),
        body('endDate').isISO8601().withMessage('endDate must be a valid date'),
        body('prizePool').optional().isFloat({ min: 0 }),
        body('entryFee').optional().isFloat({ min: 0 }),
        body('maxParticipants').optional().isInt({ min: 2 }),
        body('rules').optional().trim().isLength({ max: 5000 }),
        body('imageUrl').optional().isURL(),
        body('gymId').optional().isUUID(),
    ]),
    TournamentController.createTournament
);

router.get(
    '/',
    auth,
    validate([
        query('status').optional().isIn(['upcoming', 'active', 'completed', 'cancelled']),
        query('type').optional().isIn(['individual', 'squad', 'corporate']),
        query('gymId').optional().isUUID(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ]),
    TournamentController.listTournaments
);

router.get(
    '/:id',
    auth,
    validate([param('id').isUUID().withMessage('Invalid tournament ID')]),
    TournamentController.getTournament
);

router.put(
    '/:id',
    auth,
    validate([
        param('id').isUUID(),
        body('name').optional().trim().notEmpty().isLength({ max: 200 }),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('prizePool').optional().isFloat({ min: 0 }),
        body('entryFee').optional().isFloat({ min: 0 }),
        body('maxParticipants').optional().isInt({ min: 2 }),
        body('startDate').optional().isISO8601(),
        body('endDate').optional().isISO8601(),
        body('rules').optional().trim().isLength({ max: 5000 }),
        body('imageUrl').optional().isURL(),
    ]),
    TournamentController.updateTournament
);

router.delete(
    '/:id',
    auth,
    validate([param('id').isUUID()]),
    TournamentController.deleteTournament
);

// ─── Participant Management ─────────────────────────────────────

router.post(
    '/:id/join',
    auth,
    validate([param('id').isUUID()]),
    TournamentController.joinTournament
);

router.post(
    '/:id/leave',
    auth,
    validate([param('id').isUUID()]),
    TournamentController.leaveTournament
);

// ─── Scoring & Leaderboard ──────────────────────────────────────

router.post(
    '/:id/score',
    auth,
    validate([
        param('id').isUUID(),
        body('scoreDelta').isFloat().withMessage('scoreDelta must be a number'),
    ]),
    TournamentController.updateScore
);

router.get(
    '/:id/leaderboard',
    auth,
    validate([param('id').isUUID()]),
    TournamentController.getLeaderboard
);

router.get(
    '/:id/standing',
    auth,
    validate([param('id').isUUID()]),
    TournamentController.getUserStanding
);

export default router;
