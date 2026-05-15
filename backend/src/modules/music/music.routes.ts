/**
 * GEM Z — Music Integration Routes (Spotify)
 *
 * Routes:
 *   GET    /api/v1/music/connect      — Get Spotify OAuth URL
 *   POST   /api/v1/music/callback     — Handle OAuth callback
 *   GET    /api/v1/music/status       — Check connection status
 *   GET    /api/v1/music/playlists    — Get workout playlists
 *   GET    /api/v1/music/now-playing  — Get currently playing track
 *   GET    /api/v1/music/recommended  — Get recommended playlist for intensity
 *   PUT    /api/v1/music/intensity    — Update preferred intensity
 *   DELETE /api/v1/music/disconnect   — Disconnect Spotify
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { MusicController } from './music.controller';

const router = express.Router();

const VALID_INTENSITIES = ['low', 'medium', 'high', 'extreme'];

// ─── Spotify OAuth ──────────────────────────────────────────────

router.get('/connect', authenticate as any, MusicController.getConnectUrl as any);
router.post('/callback', authenticate as any, validateBody([
    body('code').trim().notEmpty().withMessage('code is required'),
]), MusicController.handleCallback as any);
router.get('/status', authenticate as any, MusicController.getStatus as any);

// ─── Playlists ──────────────────────────────────────────────────

router.get('/playlists', authenticate as any, validateQuery([
    query('intensity').optional().trim().isIn(VALID_INTENSITIES),
    query('workoutType').optional().trim().isString().isLength({ max: 50 }),
]), MusicController.getPlaylists as any);

router.get('/now-playing', authenticate as any, MusicController.getNowPlaying as any);

router.get('/recommended', authenticate as any, validateQuery([
    query('intensity').optional().trim().isIn(VALID_INTENSITIES),
]), MusicController.getRecommended as any);

router.put('/intensity', authenticate as any, validateBody([
    body('intensity').trim().notEmpty().isIn(VALID_INTENSITIES)
        .withMessage(`intensity must be one of: ${VALID_INTENSITIES.join(', ')}`),
]), MusicController.updateIntensity as any);

router.delete('/disconnect', authenticate as any, MusicController.disconnect as any);

export default router;
