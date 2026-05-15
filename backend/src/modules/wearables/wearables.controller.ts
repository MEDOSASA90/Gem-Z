/**
 * GEM Z — Wearables Controller
 *
 * Handles HTTP requests for wearable device integration:
 *   - POST /api/v1/wearables/connect        — Initiate device connection
 *   - GET  /api/v1/wearables/callback        — OAuth callback handler
 *   - POST /api/v1/wearables/:id/disconnect  — Disconnect device
 *   - POST /api/v1/wearables/:id/sync        — Sync health data
 *   - GET  /api/v1/wearables/list            — List user connections
 *   - GET  /api/v1/wearables/metrics         — Get aggregated health metrics
 *   - POST /api/v1/wearables/metrics/store   — Store metrics (from mobile app)
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import * as WearablesService from './wearables.service';

const log = createLogger('wearables-controller');

export class WearablesController {
    /**
     * POST /api/v1/wearables/connect
     * Initiate a wearable device connection.
     */
    static async connectDevice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { provider } = req.body;
            if (!provider) {
                throw new ValidationError('Provider is required', ErrorCode.MISSING_FIELD);
            }

            const result = await WearablesService.initiateConnection(userId, provider);

            res.status(200).json({
                success: true,
                message: 'Connection initiated',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/wearables/callback
     * OAuth callback handler for wearable providers.
     */
    static async oauthCallback(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { code, state, error: oauthError } = req.query;

            if (oauthError) {
                throw new ValidationError(`OAuth error: ${oauthError}`, ErrorCode.INVALID_INPUT);
            }

            if (!code || !state) {
                throw new ValidationError('Missing code or state parameter', ErrorCode.MISSING_FIELD);
            }

            // Provider is extracted from state or query params
            const provider = (req.query.provider as WearablesService.WearableProvider) || 'google_fit';

            const connection = await WearablesService.handleOAuthCallback(
                provider,
                code as string,
                state as string
            );

            // Redirect to frontend with success
            res.redirect(`${process.env.CLIENT_URL}/wearables?connected=true&provider=${connection.provider}`);
        } catch (error) {
            // Redirect to frontend with error
            res.redirect(`${process.env.CLIENT_URL}/wearables?connected=false&error=${encodeURIComponent((error as Error).message)}`);
        }
    }

    /**
     * POST /api/v1/wearables/:id/disconnect
     * Disconnect a wearable device.
     */
    static async disconnectDevice(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            await WearablesService.disconnectDevice(userId, id);

            res.status(200).json({
                success: true,
                message: 'Device disconnected successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/wearables/:id/sync
     * Sync health data from a connected wearable.
     */
    static async syncData(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { id } = req.params;
            const { date } = req.body;

            const result = await WearablesService.syncHealthData(userId, id, date);

            res.status(200).json({
                success: true,
                message: `Synced ${result.recordsSynced} records`,
                result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/wearables/list
     * List all wearable connections for the authenticated user.
     */
    static async listConnections(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const connections = await WearablesService.getUserConnections(userId);

            res.status(200).json({
                success: true,
                count: connections.length,
                connections,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/wearables/metrics
     * Get aggregated health metrics for the authenticated user.
     */
    static async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const days = req.query.days ? parseInt(req.query.days as string) : 30;
            const metrics = await WearablesService.getAggregatedMetrics(userId, days);

            res.status(200).json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/wearables/metrics/store
     * Store health metrics from a mobile app (for Apple HealthKit).
     */
    static async storeMetrics(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { connectionId, metrics } = req.body;
            if (!connectionId || !metrics) {
                throw new ValidationError('connectionId and metrics are required', ErrorCode.MISSING_FIELD);
            }

            await WearablesService.storeHealthMetrics(userId, connectionId, metrics);

            res.status(201).json({
                success: true,
                message: 'Health metrics stored successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
