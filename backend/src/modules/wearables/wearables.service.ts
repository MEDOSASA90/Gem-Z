/**
 * GEM Z — Wearables Sync Service
 *
 * Integrates with fitness wearable devices and platforms:
 *   - Apple HealthKit
 *   - Google Fit
 *   - Garmin Connect
 *   - Fitbit (planned)
 *
 * Handles OAuth flows, data synchronization, and health metric persistence.
 * All data is stored normalized in wearable_connections and related tables.
 */

import { db } from '../../core/database/db';
import { redisClient } from '../../core/redis/client';
import { createLogger, logAudit } from '../../core/logging/logger';
import { config } from '../../config';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('wearables');

// ─── Types ──────────────────────────────────────────────────────

export type WearableProvider = 'apple_healthkit' | 'google_fit' | 'garmin' | 'fitbit';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'syncing';

export interface WearableConnection {
    id: string;
    userId: string;
    provider: WearableProvider;
    status: ConnectionStatus;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    providerUserId: string | null;
    lastSyncedAt: Date | null;
    syncEnabled: boolean;
    metricsEnabled: {
        steps: boolean;
        heartRate: boolean;
        calories: boolean;
        sleep: boolean;
        workouts: boolean;
        distance: boolean;
        floors: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface HealthMetrics {
    connectionId: string;
    date: string;
    steps: number | null;
    activeMinutes: number | null;
    caloriesBurned: number | null;
    distanceKm: number | null;
    floorsClimbed: number | null;
    heartRateAvg: number | null;
    heartRateMin: number | null;
    heartRateMax: number | null;
    sleepHours: number | null;
    sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
    workoutCount: number | null;
    workouts: Array<{
        type: string;
        duration: number;
        calories: number;
        heartRateAvg: number;
    }> | null;
}

export interface SyncResult {
    syncedAt: Date;
    recordsSynced: number;
    metricsUpdated: string[];
    errors: string[];
}

export interface ProviderConfig {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientId?: string;
    clientSecret?: string;
}

// ─── Provider Configurations ────────────────────────────────────

const PROVIDER_CONFIGS: Record<WearableProvider, ProviderConfig> = {
    apple_healthkit: {
        authUrl: '', // Apple HealthKit uses native SDK, not OAuth web flow
        tokenUrl: '',
        scopes: ['read_workout', 'read_heart_rate', 'read_steps', 'read_sleep', 'read_nutrition'],
    },
    google_fit: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
            'https://www.googleapis.com/auth/fitness.activity.read',
            'https://www.googleapis.com/auth/fitness.body.read',
            'https://www.googleapis.com/auth/fitness.heart_rate.read',
            'https://www.googleapis.com/auth/fitness.sleep.read',
            'https://www.googleapis.com/auth/fitness.location.read',
        ],
        clientId: process.env.GOOGLE_FIT_CLIENT_ID,
        clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    },
    garmin: {
        authUrl: 'https://connect.garmin.com/oauth/authorize',
        tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
        scopes: ['activity', 'heartrate', 'sleep', 'workout'],
        clientId: process.env.GARMIN_CLIENT_ID,
        clientSecret: process.env.GARMIN_CLIENT_SECRET,
    },
    fitbit: {
        authUrl: 'https://www.fitbit.com/oauth2/authorize',
        tokenUrl: 'https://api.fitbit.com/oauth2/token',
        scopes: ['activity', 'heartrate', 'sleep', 'nutrition', 'profile'],
        clientId: process.env.FITBIT_CLIENT_ID,
        clientSecret: process.env.FITBIT_CLIENT_SECRET,
    },
};

// ─── Connection Management ──────────────────────────────────────

/**
 * Initialize a wearable connection for a user.
 * For Apple HealthKit, this creates a pending connection to be completed via the native SDK.
 * For OAuth providers, this returns the authorization URL.
 */
export async function initiateConnection(
    userId: string,
    provider: WearableProvider
): Promise<{ authUrl?: string; connectionId: string; status: string }> {
    // Check if connection already exists
    const existing = await getConnectionByProvider(userId, provider);
    if (existing && existing.status === 'connected') {
        throw new ConflictError(
            `Already connected to ${provider}. Disconnect first to reconnect.`,
            ErrorCode.CONFLICT_DUPLICATE_RESOURCE
        );
    }

    const providerConfig = PROVIDER_CONFIGS[provider];

    // For Apple HealthKit, create a placeholder connection
    if (provider === 'apple_healthkit') {
        const { rows } = await db.query(
            `
            INSERT INTO wearable_connections (
                user_id, provider, status, access_token, refresh_token,
                token_expires_at, provider_user_id, sync_enabled, metrics_enabled
            )
            VALUES ($1, $2, 'disconnected', NULL, NULL, NULL, NULL, true,
                '{"steps": true, "heartRate": true, "calories": true, "sleep": true, "workouts": true, "distance": true, "floors": true}'
            )
            ON CONFLICT (user_id, provider) DO UPDATE SET
                status = EXCLUDED.status,
                updated_at = NOW()
            RETURNING id
            `,
            [userId, provider]
        );

        log.info({ connectionId: rows[0].id, userId, provider }, 'Apple HealthKit connection initiated');
        return {
            connectionId: String(rows[0].id),
            status: 'pending_native_auth',
        };
    }

    // For OAuth providers, create a pending connection and return the auth URL
    const { rows } = await db.query(
        `
        INSERT INTO wearable_connections (
            user_id, provider, status, access_token, refresh_token,
            token_expires_at, provider_user_id, sync_enabled, metrics_enabled
        )
        VALUES ($1, $2, 'disconnected', NULL, NULL, NULL, NULL, true,
            '{"steps": true, "heartRate": true, "calories": true, "sleep": true, "workouts": true, "distance": true, "floors": true}'
        )
        ON CONFLICT (user_id, provider) DO UPDATE SET
            updated_at = NOW()
        RETURNING id
        `,
        [userId, provider]
    );

    const connectionId = String(rows[0].id);

    // Build OAuth URL
    const state = Buffer.from(`${userId}:${connectionId}:${Date.now()}`).toString('base64');
    await redisClient.setEx(`wearable:oauth:state:${connectionId}`, 600, state);

    const scopes = providerConfig.scopes.join(' ');
    const redirectUri = `${config.apiUrl}/api/v1/wearables/callback`;

    const authUrl = new URL(providerConfig.authUrl);
    authUrl.searchParams.set('client_id', providerConfig.clientId || '');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    log.info({ connectionId, userId, provider }, 'OAuth connection initiated');

    return {
        authUrl: authUrl.toString(),
        connectionId,
        status: 'pending_oauth',
    };
}

/**
 * Complete OAuth callback and store tokens.
 */
export async function handleOAuthCallback(
    provider: WearableProvider,
    code: string,
    state: string
): Promise<WearableConnection> {
    // Decode state to get connection info
    const stateData = await redisClient.get(`wearable:oauth:state:${state}`);
    if (!stateData) {
        throw new ValidationError('Invalid or expired OAuth state', ErrorCode.INVALID_INPUT);
    }

    const providerConfig = PROVIDER_CONFIGS[provider];
    const redirectUri = `${config.apiUrl}/api/v1/wearables/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: providerConfig.clientId || '',
            client_secret: providerConfig.clientSecret || '',
        }),
    });

    if (!tokenResponse.ok) {
        log.error({ status: tokenResponse.status, provider }, 'OAuth token exchange failed');
        throw new AppError('Failed to exchange OAuth code for tokens', 500, ErrorCode.SERVER_ERROR);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch provider user ID
    const providerUserId = await fetchProviderUserId(provider, accessToken);

    // Update connection
    const { rows } = await db.query(
        `
        UPDATE wearable_connections
        SET status = 'connected',
            access_token = $1,
            refresh_token = $2,
            token_expires_at = $3,
            provider_user_id = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, user_id as "userId", provider, status,
                  provider_user_id as "providerUserId",
                  last_synced_at as "lastSyncedAt", sync_enabled as "syncEnabled",
                  metrics_enabled as "metricsEnabled",
                  created_at as "createdAt", updated_at as "updatedAt"
        `,
        [accessToken, refreshToken, tokenExpiresAt, providerUserId, state]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Connection not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    await redisClient.del(`wearable:oauth:state:${state}`);

    const connection = mapConnectionRow(rows[0]);
    log.info({ connectionId: connection.id, provider }, 'Wearable connected successfully');
    logAudit('wearable_connected', { userId: connection.userId, resource: connection.id, result: 'success' });

    return connection;
}

/**
 * Disconnect a wearable device.
 */
export async function disconnectDevice(userId: string, connectionId: string): Promise<void> {
    const { rows } = await db.query(
        `SELECT user_id, provider FROM wearable_connections WHERE id = $1`,
        [connectionId]
    );

    if (rows.length === 0) {
        throw new NotFoundError('Connection not found', ErrorCode.NOT_FOUND_RESOURCE);
    }

    if (String(rows[0].user_id) !== userId) {
        throw new ForbiddenError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    await db.query(
        `
        UPDATE wearable_connections
        SET status = 'disconnected',
            access_token = NULL,
            refresh_token = NULL,
            token_expires_at = NULL,
            updated_at = NOW()
        WHERE id = $1
        `,
        [connectionId]
    );

    log.info({ connectionId, userId, provider: rows[0].provider }, 'Wearable disconnected');
    logAudit('wearable_disconnected', { userId, resource: connectionId, result: 'success' });
}

/**
 * Get all connections for a user.
 */
export async function getUserConnections(userId: string): Promise<WearableConnection[]> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", provider, status,
               provider_user_id as "providerUserId",
               last_synced_at as "lastSyncedAt", sync_enabled as "syncEnabled",
               metrics_enabled as "metricsEnabled",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM wearable_connections
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );

    return rows.map(mapConnectionRow);
}

/**
 * Get a single connection by ID.
 */
export async function getConnectionById(connectionId: string): Promise<WearableConnection | null> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", provider, status,
               provider_user_id as "providerUserId",
               last_synced_at as "lastSyncedAt", sync_enabled as "syncEnabled",
               metrics_enabled as "metricsEnabled",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM wearable_connections
        WHERE id = $1
        `,
        [connectionId]
    );

    if (rows.length === 0) return null;
    return mapConnectionRow(rows[0]);
}

// ─── Data Sync ──────────────────────────────────────────────────

/**
 * Sync health data from a connected wearable.
 */
export async function syncHealthData(
    userId: string,
    connectionId: string,
    date?: string // YYYY-MM-DD, defaults to today
): Promise<SyncResult> {
    const connection = await getConnectionById(connectionId);
    if (!connection) {
        throw new NotFoundError('Connection not found', ErrorCode.NOT_FOUND_RESOURCE);
    }
    if (connection.userId !== userId) {
        throw new ForbiddenError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }
    if (connection.status !== 'connected') {
        throw new ValidationError('Device is not connected', ErrorCode.INVALID_INPUT);
    }

    // Update status to syncing
    await db.query(
        `UPDATE wearable_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`,
        [connectionId]
    );

    const targetDate = date || new Date().toISOString().split('T')[0];
    const errors: string[] = [];
    const metricsUpdated: string[] = [];
    let recordsSynced = 0;

    try {
        // Refresh token if needed
        const accessToken = await ensureValidToken(connection);

        // Fetch and store metrics based on provider
        switch (connection.provider) {
            case 'google_fit':
                await syncGoogleFit(userId, connectionId, accessToken, targetDate, metricsUpdated, errors);
                break;
            case 'garmin':
                await syncGarmin(userId, connectionId, accessToken, targetDate, metricsUpdated, errors);
                break;
            case 'apple_healthkit':
                // Apple HealthKit data comes from the iOS app directly
                errors.push('Apple HealthKit sync must be initiated from the iOS app');
                break;
            default:
                errors.push(`Provider ${connection.provider} sync not yet implemented`);
        }

        recordsSynced = metricsUpdated.length;

        // Update last synced timestamp
        await db.query(
            `
            UPDATE wearable_connections
            SET status = 'connected',
                last_synced_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            `,
            [connectionId]
        );

        log.info({ connectionId, provider: connection.provider, recordsSynced }, 'Health data sync complete');
    } catch (error) {
        // Revert status on error
        await db.query(
            `UPDATE wearable_connections SET status = 'expired', updated_at = NOW() WHERE id = $1`,
            [connectionId]
        );
        errors.push((error as Error).message);
        log.error({ error: (error as Error).message, connectionId }, 'Health data sync failed');
    }

    return {
        syncedAt: new Date(),
        recordsSynced,
        metricsUpdated,
        errors,
    };
}

/**
 * Store health metrics received from a wearable device.
 */
export async function storeHealthMetrics(
    userId: string,
    connectionId: string,
    metrics: HealthMetrics
): Promise<void> {
    const connection = await getConnectionById(connectionId);
    if (!connection || connection.userId !== userId) {
        throw new ForbiddenError('Access denied', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
    }

    await db.query(
        `
        INSERT INTO wearable_health_metrics (
            connection_id, metric_date, steps, active_minutes,
            calories_burned, distance_km, floors_climbed,
            heart_rate_avg, heart_rate_min, heart_rate_max,
            sleep_hours, sleep_quality, workout_count, workouts
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (connection_id, metric_date) DO UPDATE SET
            steps = EXCLUDED.steps,
            active_minutes = EXCLUDED.active_minutes,
            calories_burned = EXCLUDED.calories_burned,
            distance_km = EXCLUDED.distance_km,
            floors_climbed = EXCLUDED.floors_climbed,
            heart_rate_avg = EXCLUDED.heart_rate_avg,
            heart_rate_min = EXCLUDED.heart_rate_min,
            heart_rate_max = EXCLUDED.heart_rate_max,
            sleep_hours = EXCLUDED.sleep_hours,
            sleep_quality = EXCLUDED.sleep_quality,
            workout_count = EXCLUDED.workout_count,
            workouts = EXCLUDED.workouts,
            synced_at = NOW()
        `,
        [
            connectionId,
            metrics.date,
            metrics.steps,
            metrics.activeMinutes,
            metrics.caloriesBurned,
            metrics.distanceKm,
            metrics.floorsClimbed,
            metrics.heartRateAvg,
            metrics.heartRateMin,
            metrics.heartRateMax,
            metrics.sleepHours,
            metrics.sleepQuality,
            metrics.workoutCount,
            JSON.stringify(metrics.workouts),
        ]
    );

    // Update last synced timestamp
    await db.query(
        `UPDATE wearable_connections SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [connectionId]
    );

    log.info({ connectionId, date: metrics.date }, 'Health metrics stored');
}

/**
 * Get aggregated health metrics for a user.
 */
export async function getAggregatedMetrics(
    userId: string,
    days: number = 30
): Promise<{
    summary: {
        avgSteps: number;
        avgCalories: number;
        avgSleep: number;
        avgHeartRate: number;
        totalWorkouts: number;
    };
    daily: Array<{
        date: string;
        steps: number | null;
        calories: number | null;
        sleep: number | null;
        heartRateAvg: number | null;
        workouts: number | null;
    }>;
}> {
    const { rows: summaryRows } = await db.query(
        `
        SELECT
            COALESCE(AVG(m.steps), 0)::int as avg_steps,
            COALESCE(AVG(m.calories_burned), 0)::int as avg_calories,
            COALESCE(AVG(m.sleep_hours), 0) as avg_sleep,
            COALESCE(AVG(m.heart_rate_avg), 0)::int as avg_hr,
            COALESCE(SUM(m.workout_count), 0)::int as total_workouts
        FROM wearable_health_metrics m
        JOIN wearable_connections c ON m.connection_id = c.id
        WHERE c.user_id = $1 AND m.metric_date >= CURRENT_DATE - INTERVAL '${days} days'
        `,
        [userId]
    );

    const { rows: dailyRows } = await db.query(
        `
        SELECT
            m.metric_date as date,
            m.steps,
            m.calories_burned as calories,
            m.sleep_hours as sleep,
            m.heart_rate_avg as "heartRateAvg",
            m.workout_count as workouts
        FROM wearable_health_metrics m
        JOIN wearable_connections c ON m.connection_id = c.id
        WHERE c.user_id = $1 AND m.metric_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY m.metric_date DESC
        LIMIT $2
        `,
        [userId, days]
    );

    return {
        summary: {
            avgSteps: parseInt(summaryRows[0]?.avg_steps || '0'),
            avgCalories: parseInt(summaryRows[0]?.avg_calories || '0'),
            avgSleep: parseFloat(summaryRows[0]?.avg_sleep || '0'),
            avgHeartRate: parseInt(summaryRows[0]?.avg_hr || '0'),
            totalWorkouts: parseInt(summaryRows[0]?.total_workouts || '0'),
        },
        daily: dailyRows,
    };
}

// ─── Helpers ────────────────────────────────────────────────────

import { ForbiddenError } from '../../core/errors';

function mapConnectionRow(row: any): WearableConnection {
    return {
        id: String(row.id),
        userId: String(row.userId),
        provider: row.provider,
        status: row.status,
        accessToken: null, // Never expose tokens
        refreshToken: null,
        tokenExpiresAt: null,
        providerUserId: row.providerUserId,
        lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : null,
        syncEnabled: row.syncEnabled,
        metricsEnabled: row.metricsEnabled || {
            steps: true,
            heartRate: true,
            calories: true,
            sleep: true,
            workouts: true,
            distance: true,
            floors: true,
        },
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}

async function getConnectionByProvider(userId: string, provider: WearableProvider): Promise<WearableConnection | null> {
    const { rows } = await db.query(
        `
        SELECT id, user_id as "userId", provider, status,
               provider_user_id as "providerUserId",
               last_synced_at as "lastSyncedAt", sync_enabled as "syncEnabled",
               metrics_enabled as "metricsEnabled",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM wearable_connections
        WHERE user_id = $1 AND provider = $2
        `,
        [userId, provider]
    );

    if (rows.length === 0) return null;
    return mapConnectionRow(rows[0]);
}

async function fetchProviderUserId(provider: WearableProvider, accessToken: string): Promise<string | null> {
    try {
        let url: string;
        switch (provider) {
            case 'google_fit':
                url = 'https://www.googleapis.com/oauth2/v2/userinfo';
                break;
            case 'garmin':
                return null; // Garmin uses OAuth1, no simple userinfo endpoint
            default:
                return null;
        }

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.id || null;
    } catch {
        return null;
    }
}

async function ensureValidToken(connection: WearableConnection): Promise<string> {
    // In a real implementation, this would check expiry and refresh tokens
    // For now, we just fetch the token from the DB
    const { rows } = await db.query(
        `SELECT access_token FROM wearable_connections WHERE id = $1`,
        [connection.id]
    );
    return rows[0]?.access_token || '';
}

async function syncGoogleFit(
    _userId: string,
    connectionId: string,
    accessToken: string,
    targetDate: string,
    metricsUpdated: string[],
    errors: string[]
): Promise<void> {
    try {
        // Google Fit data source aggregation
        const startTime = new Date(targetDate).getTime() + (4 * 60 * 60 * 1000); // Start at 04:00 AM
        const endTime = startTime + (24 * 60 * 60 * 1000);

        const response = await fetch(
            'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aggregateBy: [
                        { dataTypeName: 'com.google.step_count.delta' },
                        { dataTypeName: 'com.google.calories.expended' },
                        { dataTypeName: 'com.google.distance.delta' },
                        { dataTypeName: 'com.google.heart_rate.bpm' },
                        { dataTypeName: 'com.google.active_minutes' },
                    ],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startTime,
                    endTimeMillis: endTime,
                }),
            }
        );

        if (!response.ok) {
            errors.push(`Google Fit API error: ${response.status}`);
            return;
        }

        const data = await response.json();

        let steps: number | null = null;
        let calories: number | null = null;
        let distance: number | null = null;
        let heartRateAvg: number | null = null;
        let activeMinutes: number | null = null;

        for (const bucket of data.bucket || []) {
            for (const dataset of bucket.dataset || []) {
                for (const point of dataset.point || []) {
                    for (const value of point.value || []) {
                        switch (dataset.dataSourceId) {
                            case 'derived:com.google.step_count.delta:com.google.android.gms:aggregated':
                                steps = value.intVal || null;
                                if (steps) metricsUpdated.push('steps');
                                break;
                            case 'derived:com.google.calories.expended:com.google.android.gms:aggregated':
                                calories = Math.round(value.fpVal || 0) || null;
                                if (calories) metricsUpdated.push('calories');
                                break;
                            case 'derived:com.google.distance.delta:com.google.android.gms:aggregated':
                                distance = Math.round((value.fpVal || 0) / 1000 * 100) / 100 || null;
                                if (distance) metricsUpdated.push('distance');
                                break;
                            case 'derived:com.google.heart_rate.bpm:com.google.android.gms:aggregated':
                                heartRateAvg = Math.round(value.fpVal || 0) || null;
                                if (heartRateAvg) metricsUpdated.push('heart_rate');
                                break;
                            case 'derived:com.google.active_minutes:com.google.android.gms:aggregated':
                                activeMinutes = value.intVal || null;
                                if (activeMinutes) metricsUpdated.push('active_minutes');
                                break;
                        }
                    }
                }
            }
        }

        // Store the synced metrics
        await db.query(
            `
            INSERT INTO wearable_health_metrics (
                connection_id, metric_date, steps, active_minutes,
                calories_burned, distance_km, heart_rate_avg, workout_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
            ON CONFLICT (connection_id, metric_date) DO UPDATE SET
                steps = COALESCE(EXCLUDED.steps, wearable_health_metrics.steps),
                active_minutes = COALESCE(EXCLUDED.active_minutes, wearable_health_metrics.active_minutes),
                calories_burned = COALESCE(EXCLUDED.calories_burned, wearable_health_metrics.calories_burned),
                distance_km = COALESCE(EXCLUDED.distance_km, wearable_health_metrics.distance_km),
                heart_rate_avg = COALESCE(EXCLUDED.heart_rate_avg, wearable_health_metrics.heart_rate_avg),
                synced_at = NOW()
            `,
            [connectionId, targetDate, steps, activeMinutes, calories, distance, heartRateAvg]
        );
    } catch (error) {
        errors.push(`Google Fit sync error: ${(error as Error).message}`);
    }
}

async function syncGarmin(
    _userId: string,
    _connectionId: string,
    _accessToken: string,
    _targetDate: string,
    _metricsUpdated: string[],
    errors: string[]
): Promise<void> {
    errors.push('Garmin sync is a placeholder - requires Garmin Health API partner access');
}
