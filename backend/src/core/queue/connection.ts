/**
 * GEM Z — BullMQ Redis Connection Configuration
 *
 * Provides a shared Redis connection for all BullMQ queues and workers.
 * Uses ioredis for robust connection handling with automatic reconnection.
 * Gracefully handles Redis disconnection to prevent job loss.
 */

import IORedis from 'ioredis';
import { config } from '../../config';

// ─── Connection State ────────────────────────────────────────

let redisConnection: IORedis | null = null;
let isConnected = false;

// ─── Redis Connection Options ────────────────────────────────

function getRedisOptions(): IORedis.RedisOptions {
    const isProd = config.isProduction;

    return {
        maxRetriesPerRequest: null, // Required by BullMQ — let BullMQ handle retries
        enableReadyCheck: true,
        enableOfflineQueue: true, // Queue commands until Redis is ready
        lazyConnect: true,        // Don't connect immediately; allow explicit control
        keepAlive: 30000,         // 30s TCP keepalive
        connectTimeout: 10000,    // 10s connection timeout
        disconnectTimeout: 5000,  // 5s graceful disconnect

        // Reconnection strategy
        retryStrategy: (times: number) => {
            const delay = Math.min(times * 200, 3000); // Max 3s between retries
            console.log(`[Queue] Redis reconnect attempt ${times}, retrying in ${delay}ms...`);
            return delay;
        },

        // Retry on specific errors (read/write timeouts)
        reconnectOnError: (err: Error): boolean | 1 | 2 => {
            const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'];
            const shouldReconnect = targetErrors.some(e => err.message.includes(e));
            if (shouldReconnect) {
                console.warn(`[Queue] Redis error triggering reconnect: ${err.message}`);
            }
            return shouldReconnect ? 2 : false; // 2 = reconnect and flush pending commands
        },

        // TLS for production
        ...(isProd && config.redisUrl.startsWith('rediss://')
            ? { tls: { rejectUnauthorized: false } }
            : {}),
    };
}

// ─── Parse Redis URL ─────────────────────────────────────────

function parseRedisUrl(url: string): { host: string; port: number; password?: string; db?: number } {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname || 'localhost',
            port: Number(parsed.port) || 6379,
            password: parsed.password || undefined,
            db: parsed.pathname && parsed.pathname.length > 1
                ? Number(parsed.pathname.slice(1))
                : undefined,
        };
    } catch {
        // Fallback for simple host:port strings
        const [host, portStr] = url.replace('redis://', '').replace('rediss://', '').split(':');
        return {
            host: host || 'localhost',
            port: Number(portStr) || 6379,
        };
    }
}

// ─── Create Redis Connection ─────────────────────────────────

export function createRedisConnection(): IORedis {
    if (redisConnection) {
        return redisConnection;
    }

    const redisUrl = config.redisUrl || 'redis://localhost:6379';
    const options = getRedisOptions();

    console.log(`[Queue] Creating Redis connection to ${parseRedisUrl(redisUrl).host}:${parseRedisUrl(redisUrl).port}...`);

    redisConnection = new IORedis(redisUrl, options);

    // ─── Event Listeners ─────────────────────────────────────

    redisConnection.on('connect', () => {
        console.log('[Queue] Redis connection established.');
    });

    redisConnection.on('ready', () => {
        isConnected = true;
        console.log('[Queue] Redis is ready to accept commands.');
    });

    redisConnection.on('error', (err: Error) => {
        console.error('[Queue] Redis connection error:', err.message);
        // Don't crash — BullMQ handles reconnection internally
    });

    redisConnection.on('close', () => {
        isConnected = false;
        console.warn('[Queue] Redis connection closed. Jobs will be queued locally until reconnection.');
    });

    redisConnection.on('reconnecting', (delay: number) => {
        console.log(`[Queue] Redis reconnecting in ${delay}ms...`);
    });

    redisConnection.on('end', () => {
        isConnected = false;
        console.warn('[Queue] Redis connection ended. No more reconnection attempts.');
    });

    return redisConnection;
}

// ─── Get Existing Connection ─────────────────────────────────

export function getRedisConnection(): IORedis {
    if (!redisConnection) {
        return createRedisConnection();
    }
    return redisConnection;
}

// ─── Check Connection Health ─────────────────────────────────

export async function isRedisHealthy(): Promise<boolean> {
    if (!redisConnection) return false;
    try {
        await redisConnection.ping();
        return true;
    } catch {
        return false;
    }
}

// ─── Graceful Shutdown ───────────────────────────────────────

export async function closeRedisConnection(): Promise<void> {
    if (!redisConnection) return;

    console.log('[Queue] Gracefully closing Redis connection...');

    try {
        // Remove all listeners to prevent further events
        redisConnection.removeAllListeners();

        // Disconnect gracefully
        await redisConnection.quit();
        console.log('[Queue] Redis connection closed gracefully.');
    } catch (err) {
        console.error('[Queue] Error closing Redis connection:', (err as Error).message);
        // Force disconnect if quit fails
        redisConnection.disconnect();
    } finally {
        redisConnection = null;
        isConnected = false;
    }
}

// ─── Connection Status ───────────────────────────────────────

export function getConnectionStatus(): { connected: boolean; host: string; port: number } {
    const redisUrl = config.redisUrl || 'redis://localhost:6379';
    const parsed = parseRedisUrl(redisUrl);
    return {
        connected: isConnected,
        host: parsed.host,
        port: parsed.port,
    };
}
