/**
 * GEM Z — Wearables Routes
 *
 * Routes:
 *   POST /api/v1/wearables/connect          — Initiate device connection
 *   GET  /api/v1/wearables/callback          — OAuth callback
 *   POST /api/v1/wearables/:id/disconnect    — Disconnect device
 *   POST /api/v1/wearables/:id/sync          — Sync health data
 *   GET  /api/v1/wearables/list              — List user connections
 *   GET  /api/v1/wearables/metrics           — Get aggregated metrics
 *   POST /api/v1/wearables/metrics/store     — Store metrics from mobile
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../core/middlewares/validation.middleware';
import { WearablesController } from './wearables.controller';

const router = express.Router();

const VALID_PROVIDERS = ['apple_healthkit', 'google_fit', 'garmin', 'fitbit'];

// ─── Connection Management ──────────────────────────────────────

router.post('/connect', authenticate as any, validateBody([
    body('provider')
        .trim()
        .notEmpty()
        .withMessage('provider is required')
        .isIn(VALID_PROVIDERS)
        .withMessage(`provider must be one of: ${VALID_PROVIDERS.join(', ')}'),
]), WearablesController.connectDevice as any);

router.get('/callback', WearablesController.oauthCallback as any);

router.post('/:id/disconnect', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Connection ID is required').isUUID().withMessage('Invalid connection ID'),
]), WearablesController.disconnectDevice as any);

// ─── Data Sync ──────────────────────────────────────────────────

router.post('/:id/sync', authenticate as any, validateParams([
    param('id').trim().notEmpty().withMessage('Connection ID is required').isUUID(),
]), validateBody([
    body('date').optional().isISO8601().withMessage('date must be in YYYY-MM-DD format'),
]), WearablesController.syncData as any);

// ─── Retrieval ──────────────────────────────────────────────────

router.get('/list', authenticate as any, WearablesController.listConnections as any);

router.get('/metrics', authenticate as any, validateQuery([
    query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
]), WearablesController.getMetrics as any);

router.post('/metrics/store', authenticate as any, validateBody([
    body('connectionId').trim().notEmpty().withMessage('connectionId is required').isUUID(),
    body('metrics').isObject().withMessage('metrics must be an object'),
    body('metrics.date').notEmpty().withMessage('metrics.date is required').isISO8601(),
]), WearablesController.storeMetrics as any);

export default router;
