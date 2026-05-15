/**
 * GEM Z — Music Integration Controller (Spotify)
 *
 * Handles HTTP requests for Spotify music integration:
 *   - GET /api/v1/music/connect     — Get Spotify OAuth URL
 *   - POST /api/v1/music/callback   — Handle OAuth callback
 *   - GET /api/v1/music/playlists   — Get workout playlists
 *   - GET /api/v1/music/now-playing — Get currently playing track
 *   - GET /api/v1/music/recommended — Get recommended playlist for intensity
 *   - DELETE /api/v1/music/disconnect — Disconnect Spotify
 *   - PUT /api/v1/music/intensity   — Update preferred intensity
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { createLogger } from '../../core/logging/logger';
import {
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';
import * as MusicService from './music.service';

const log = createLogger('music-controller');

export class MusicController {
    /**
     * GET /api/v1/music/connect
     * Get Spotify OAuth authorization URL.
     */
    static async getConnectUrl(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const authUrl = MusicService.getSpotifyAuthUrl();

            res.status(200).json({
                success: true,
                data: {
                    authUrl,
                    state: new URL(authUrl).searchParams.get('state'),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/music/callback
     * Handle Spotify OAuth callback and store tokens.
     */
    static async handleCallback(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { code } = req.body;
            if (!code) {
                throw new ValidationError('code is required', ErrorCode.MISSING_FIELD);
            }

            const connection = await MusicService.connectSpotify(userId, code);

            res.status(200).json({
                success: true,
                message: 'Spotify connected successfully',
                connection: {
                    id: connection.id,
                    provider: connection.provider,
                    preferredIntensity: connection.preferredIntensity,
                    connectedAt: connection.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/music/playlists
     * Get user's Spotify playlists, optionally filtered by workout intensity.
     */
    static async getPlaylists(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const intensity = req.query.intensity as string | undefined;
            const workoutType = req.query.workoutType as string | undefined;

            const playlists = await MusicService.getPlaylists(userId, intensity, workoutType);

            res.status(200).json({
                success: true,
                data: playlists,
                count: playlists.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/music/now-playing
     * Get currently playing track.
     */
    static async getNowPlaying(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const nowPlaying = await MusicService.getNowPlaying(userId);

            res.status(200).json({
                success: true,
                data: nowPlaying,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/music/recommended
     * Get recommended playlist based on workout intensity.
     */
    static async getRecommended(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const intensity = (req.query.intensity as string) || 'medium';
            const validIntensities = ['low', 'medium', 'high', 'extreme'];

            if (!validIntensities.includes(intensity)) {
                throw new ValidationError(
                    `intensity must be one of: ${validIntensities.join(', ')}`,
                    ErrorCode.INVALID_INPUT
                );
            }

            const playlist = await MusicService.getRecommendedPlaylist(
                userId,
                intensity as 'low' | 'medium' | 'high' | 'extreme'
            );

            res.status(200).json({
                success: true,
                data: playlist,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/music/disconnect
     * Disconnect Spotify account.
     */
    static async disconnect(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            await MusicService.disconnectSpotify(userId);

            res.status(200).json({
                success: true,
                message: 'Spotify disconnected',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/music/intensity
     * Update preferred workout music intensity.
     */
    static async updateIntensity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const { intensity } = req.body;
            const validIntensities = ['low', 'medium', 'high', 'extreme'];

            if (!validIntensities.includes(intensity)) {
                throw new ValidationError(
                    `intensity must be one of: ${validIntensities.join(', ')}`,
                    ErrorCode.INVALID_INPUT
                );
            }

            await MusicService.updateIntensity(userId, intensity);

            res.status(200).json({
                success: true,
                message: 'Preferred intensity updated',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/music/status
     * Check if user has a Spotify connection.
     */
    static async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ValidationError('Authentication required', ErrorCode.AUTH_UNAUTHORIZED);
            }

            const connection = await MusicService.getConnection(userId);

            res.status(200).json({
                success: true,
                data: {
                    connected: !!connection,
                    connection: connection
                        ? {
                              id: connection.id,
                              provider: connection.provider,
                              preferredIntensity: connection.preferredIntensity,
                              playlistSyncEnabled: connection.playlistSyncEnabled,
                              connectedAt: connection.createdAt,
                          }
                        : null,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
