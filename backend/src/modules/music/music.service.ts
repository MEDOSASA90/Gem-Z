/**
 * GEM Z — Music Integration Service (Spotify)
 *
 * Manages Spotify OAuth connections, workout playlist curation,
 * and now-playing integration. Recommends playlists based on
 * workout intensity and type.
 *
 * Features:
 *   - Spotify OAuth 2.0 connect + token refresh
 *   - Workout playlist discovery by intensity
 *   - Now-playing track fetch
 *   - Intensity-based playlist switching
 *   - Auto-sync curated GEM Z playlists
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/i18n/errors';

const log = createLogger('music');

// ─── Types ──────────────────────────────────────────────────────

export interface SpotifyTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

export interface MusicConnection {
    id: string;
    userId: string;
    provider: 'spotify' | 'apple_music' | 'youtube_music';
    providerUserId?: string;
    accessToken: string;
    preferredIntensity: 'low' | 'medium' | 'high' | 'extreme';
    playlistSyncEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MusicPlaylist {
    id: string;
    connectionId: string;
    providerPlaylistId: string;
    name: string;
    description?: string;
    intensity: 'low' | 'medium' | 'high' | 'extreme';
    workoutType?: string;
    durationMinutes?: number;
    trackCount: number;
    imageUrl?: string;
    isGemzCurated: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NowPlaying {
    trackName: string;
    artistName: string;
    albumName: string;
    albumImageUrl?: string;
    durationMs: number;
    progressMs: number;
    isPlaying: boolean;
    playlistName?: string;
}

// ─── Spotify API Helpers ────────────────────────────────────────

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';

export function getSpotifyAuthUrl(): string {
    const clientId = config.spotifyClientId || process.env.SPOTIFY_CLIENT_ID || '';
    const redirectUri = `${config.apiUrl || process.env.API_URL || 'http://localhost:5000'}/api/v1/music/callback`;
    const scopes = [
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'playlist-read-private',
        'playlist-read-collaborative',
        'streaming',
    ].join(' ');

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes,
        state: generateState(),
    });

    return `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

function generateState(): string {
    return Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64url');
}

async function spotifyApiRequest(
    endpoint: string,
    accessToken: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: any
): Promise<any> {
    const url = `${SPOTIFY_API_BASE}${endpoint}`;
    const options: RequestInit = {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        throw new AppError('Spotify token expired', 401, ErrorCode.AUTH_EXPIRED_TOKEN);
    }
    if (!response.ok) {
        const errorData = await response.text();
        log.error({ status: response.status, error: errorData, endpoint }, 'Spotify API error');
        throw new AppError('Spotify API request failed', 503, ErrorCode.SERVICE_UNAVAILABLE);
    }

    return response.json();
}

async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens> {
    const clientId = config.spotifyClientId || process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = config.spotifyClientSecret || process.env.SPOTIFY_CLIENT_SECRET || '';

    const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new AppError('Failed to refresh Spotify token', 401, ErrorCode.AUTH_EXPIRED_TOKEN);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
    };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Exchange authorization code for tokens and store connection.
 */
export async function connectSpotify(userId: string, code: string): Promise<MusicConnection> {
    const clientId = config.spotifyClientId || process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = config.spotifyClientSecret || process.env.SPOTIFY_CLIENT_SECRET || '';
    const redirectUri = `${config.apiUrl || process.env.API_URL || 'http://localhost:5000'}/api/v1/music/callback`;

    const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        log.error({ error: errorData }, 'Spotify token exchange failed');
        throw new AppError('Failed to connect Spotify account', 400, ErrorCode.AUTH_INVALID_TOKEN);
    }

    const tokenData = await response.json();

    // Get user profile from Spotify
    const profile = await spotifyApiRequest('/me', tokenData.access_token);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert connection
    const { rows } = await db.query(
        `
        INSERT INTO music_connections (
            user_id, provider, provider_user_id, access_token,
            refresh_token, expires_at
        )
        VALUES ($1, 'spotify', $2, $3, $4, $5)
        ON CONFLICT (user_id, provider) DO UPDATE SET
            provider_user_id = EXCLUDED.provider_user_id,
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at,
            updated_at = NOW()
        RETURNING id, user_id as "userId", provider, provider_user_id as "providerUserId",
                  access_token as "accessToken", preferred_intensity as "preferredIntensity",
                  playlist_sync_enabled as "playlistSyncEnabled",
                  created_at as "createdAt", updated_at as "updatedAt"
        `,
        [userId, profile.id, tokenData.access_token, tokenData.refresh_token, expiresAt]
    );

    const connection = mapConnectionRow(rows[0]);

    log.info({ userId, spotifyUser: profile.id }, 'Spotify connected');
    logAudit('music_connect', { userId, resource: connection.id, result: 'success' });

    // Sync playlists in background
    syncUserPlaylists(connection.id, connection.accessToken).catch(() => {});

    return connection;
}

/**
 * Get user's music connection.
 */
export async function getConnection(userId: string): Promise<MusicConnection | null> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", provider, provider_user_id as "providerUserId",
               access_token as "accessToken", preferred_intensity as "preferredIntensity",
               playlist_sync_enabled as "playlistSyncEnabled",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM music_connections
        WHERE user_id = $1 AND provider = 'spotify'
        `,
        [userId]
    );

    if (rows.length === 0) return null;
    return mapConnectionRow(rows[0]);
}

/**
 * Get or refresh valid access token for a user.
 */
async function getValidAccessToken(userId: string): Promise<string> {
    const connection = await getConnection(userId);
    if (!connection) {
        throw new AppError('Spotify not connected', 400, ErrorCode.NOT_FOUND_RESOURCE);
    }

    // Check if token needs refresh (expires in < 5 minutes)
    const needsRefresh = connection.expiresAt && connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

    if (needsRefresh) {
        // Get refresh token from DB
        const { rows } = await db.query(
            `SELECT refresh_token FROM music_connections WHERE id = $1`,
            [connection.id]
        );
        if (!rows[0]?.refresh_token) {
            throw new AppError('Spotify refresh token not available', 401, ErrorCode.AUTH_EXPIRED_TOKEN);
        }

        const tokens = await refreshSpotifyToken(rows[0].refresh_token);
        await db.query(
            `UPDATE music_connections SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW() WHERE id = $4`,
            [tokens.accessToken, tokens.refreshToken, tokens.expiresAt, connection.id]
        );
        return tokens.accessToken;
    }

    return connection.accessToken;
}

/**
 * Get playlists for the user, optionally filtered by intensity.
 */
export async function getPlaylists(
    userId: string,
    intensity?: string,
    workoutType?: string
): Promise<MusicPlaylist[]> {
    const accessToken = await getValidAccessToken(userId);

    // Fetch from Spotify API for fresh data
    try {
        const data = await spotifyApiRequest('/me/playbooks?limit=50', accessToken);

        // Sync to DB
        const connection = await getConnection(userId);
        if (connection && data.items) {
            for (const playlist of data.items.slice(0, 50)) {
                const intensityLevel = guessIntensityFromPlaylistName(playlist.name);
                await db.query(
                    `
                    INSERT INTO music_playlists (
                        connection_id, provider_playlist_id, name, description,
                        intensity, workout_type, track_count, image_url
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT DO NOTHING
                    `,
                    [
                        connection.id,
                        playlist.id,
                        playlist.name,
                        playlist.description || null,
                        intensityLevel,
                        workoutType || null,
                        playlist.tracks?.total || 0,
                        playlist.images?.[0]?.url || null,
                    ]
                );
            }
        }
    } catch (err) {
        log.warn({ userId, error: (err as Error).message }, 'Failed to sync Spotify playlists');
    }

    // Build query
    let whereClause = 'WHERE mc.user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (intensity) {
        whereClause += ` AND mp.intensity = $${paramIndex++}`;
        params.push(intensity);
    }
    if (workoutType) {
        whereClause += ` AND mp.workout_type ILIKE $${paramIndex++}`;
        params.push(`%${workoutType}%`);
    }

    const { rows } = await db.query(
        `
        SELECT mp.id, mp.connection_id as "connectionId", mp.provider_playlist_id as "providerPlaylistId",
               mp.name, mp.description, mp.intensity, mp.workout_type as "workoutType",
               mp.duration_minutes as "durationMinutes", mp.track_count as "trackCount",
               mp.image_url as "imageUrl", mp.is_gemz_curated as "isGemzCurated",
               mp.created_at as "createdAt", mp.updated_at as "updatedAt"
        FROM music_playlists mp
        JOIN music_connections mc ON mp.connection_id = mc.id
        ${whereClause}
        ORDER BY mp.is_gemz_curated DESC, mp.name ASC
        `,
        params
    );

    return rows.map(mapPlaylistRow);
}

/**
 * Get currently playing track.
 */
export async function getNowPlaying(userId: string): Promise<NowPlaying | null> {
    const accessToken = await getValidAccessToken(userId);

    try {
        const data = await spotifyApiRequest('/me/player/currently-playing', accessToken);

        if (!data || !data.item) {
            return null;
        }

        return {
            trackName: data.item.name,
            artistName: data.item.artists.map((a: any) => a.name).join(', '),
            albumName: data.item.album?.name || '',
            albumImageUrl: data.item.album?.images?.[0]?.url,
            durationMs: data.item.duration_ms,
            progressMs: data.progress_ms || 0,
            isPlaying: data.is_playing,
            playlistName: data.context?.type === 'playlist' ? 'Playlist' : undefined,
        };
    } catch (err) {
        log.warn({ userId, error: (err as Error).message }, 'Failed to get now playing');
        return null;
    }
}

/**
 * Disconnect Spotify.
 */
export async function disconnectSpotify(userId: string): Promise<void> {
    await db.query(
        `DELETE FROM music_connections WHERE user_id = $1 AND provider = 'spotify'`,
        [userId]
    );

    log.info({ userId }, 'Spotify disconnected');
    logAudit('music_disconnect', { userId, result: 'success' });
}

/**
 * Update preferred intensity.
 */
export async function updateIntensity(
    userId: string,
    intensity: 'low' | 'medium' | 'high' | 'extreme'
): Promise<void> {
    await db.query(
        `UPDATE music_connections SET preferred_intensity = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'spotify'`,
        [intensity, userId]
    );
}

/**
 * Get recommended playlist for current workout intensity.
 */
export async function getRecommendedPlaylist(
    userId: string,
    workoutIntensity: 'low' | 'medium' | 'high' | 'extreme'
): Promise<MusicPlaylist | null> {
    const playlists = await getPlaylists(userId, workoutIntensity);
    if (playlists.length > 0) return playlists[0];

    // Fall back to any playlist
    const allPlaylists = await getPlaylists(userId);
    return allPlaylists[0] || null;
}

// ─── Helpers ────────────────────────────────────────────────────

async function syncUserPlaylists(connectionId: string, accessToken: string): Promise<void> {
    try {
        const data = await spotifyApiRequest('/me/playlists?limit=50', accessToken);
        if (!data.items) return;

        for (const playlist of data.items) {
            const intensityLevel = guessIntensityFromPlaylistName(playlist.name);
            await db.query(
                `
                INSERT INTO music_playlists (
                    connection_id, provider_playlist_id, name, description,
                    intensity, track_count, image_url
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING
                `,
                [
                    connectionId,
                    playlist.id,
                    playlist.name,
                    playlist.description || null,
                    intensityLevel,
                    playlist.tracks?.total || 0,
                    playlist.images?.[0]?.url || null,
                ]
            );
        }

        log.info({ connectionId, count: data.items.length }, 'Synced Spotify playlists');
    } catch (err) {
        log.warn({ connectionId, error: (err as Error).message }, 'Playlist sync failed');
    }
}

function guessIntensityFromPlaylistName(name: string): 'low' | 'medium' | 'high' | 'extreme' {
    const lower = name.toLowerCase();
    if (/extreme|beast|insanity|death|kill|hell|brutal|hardcore/i.test(lower)) return 'extreme';
    if (/high|intense|power|aggressive|hard|energy|edm|trap/i.test(lower)) return 'high';
    if (/low|chill|relax|calm|meditation|yoga|stretch|cool.*down/i.test(lower)) return 'low';
    return 'medium';
}

function mapConnectionRow(row: any): MusicConnection {
    return {
        id: String(row.id),
        userId: String(row.userId),
        provider: row.provider,
        providerUserId: row.providerUserId,
        accessToken: row.accessToken,
        preferredIntensity: row.preferredIntensity,
        playlistSyncEnabled: row.playlistSyncEnabled,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}

function mapPlaylistRow(row: any): MusicPlaylist {
    return {
        id: String(row.id),
        connectionId: String(row.connectionId),
        providerPlaylistId: row.providerPlaylistId,
        name: row.name,
        description: row.description,
        intensity: row.intensity,
        workoutType: row.workoutType,
        durationMinutes: row.durationMinutes,
        trackCount: parseInt(row.trackCount),
        imageUrl: row.imageUrl,
        isGemzCurated: row.isGemzCurated,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}
