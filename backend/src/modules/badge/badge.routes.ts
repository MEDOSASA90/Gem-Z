/**
 * GEM Z — Badges System Routes
 *
 * Routes:
 *   GET  /api/v1/badges           — List badges with progress
 *   POST /api/v1/badges/check     — Check and award badges
 *   GET  /api/v1/badges/stats     — Get badge statistics
 *   POST /api/v1/badges/seed      — Seed default badges
 */

import express from 'express';
import { AuthRequest, verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { BadgeController } from './badge.controller';

const router = express.Router();

const auth = authenticate as any;

// ─── Routes ─────────────────────────────────────────────────────

router.get('/', auth, BadgeController.listBadges);
router.post('/check', auth, BadgeController.checkAndAward);
router.get('/stats', auth, BadgeController.getBadgeStats);
router.post('/seed', auth, BadgeController.seedBadges);

export default router;
