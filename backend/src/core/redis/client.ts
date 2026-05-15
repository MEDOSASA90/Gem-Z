/**
 * GEM Z — Redis Client (ioredis)
 *
 * Production-ready Redis singleton with auto-reconnect, retry logic,
 * and graceful error handling. Safe to import anywhere — connection
 * is established lazily or via explicit `connectRedis()`.
 */

import Redis from 'ioredis';
import { config } from '../../config';
import { logger } from '../logging/logger';

const log = logger.child({ module: 'redis' });

// ─── Retry Strategy ──────────────────────────────────────────────

const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY_MS = 100;
const MAX_RETRY_DELAY_MS = 3000;

/**
 * Exponential backoff with jitter for reconnection attempts.
 */
function retryStrategy(times: number): number | void {
    if (times > MAX_RETRIES) {
        log.error(
            { retries: times },
            'Redis max retries exceeded — giving up'
        );
        return undefined; // stop retrying
    }

    const jitter = Math.random() * 200;
    const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, times - 1) + jitter,
        MAX_RETRY_DELAY_MS
    );

    log.warn(
        { attempt: times, nextRetryMs: Math.round(delay) },
        'Redis connection lost — retrying...'
    );

    return Math.round(delay);
}

// ─── Redis Client Instance ───────────────────────────────────────

export const redisClient = new Redis(config.redisUrl, {
    // Connection
    lazyConnect: true,           // connect explicitly via connectRedis()
    keepAlive: 30000,            // TCP keep-alive (30s)
    connectTimeout: 10000,       // 10s connection timeout
    commandTimeout: 5000,        // 5s per-command timeout

    // Retry / Reconnect
    retryStrategy,
    reconnectOnError: (err: Error): boolean | 1 | 2 => {
        const msg = err.message.toLowerCase();
        // Reconnect on READONLY (failover) or ECONNREFUSED
        if (msg.includes('econnrefused') || msg.includes('read only')) {
            log.warn({ errMsg: err.message }, 'Redis reconnect triggered');
            return true;
        }
        // Don't reconnect on other errors
        return false;
    },

    // Max retries per request before failing
    maxRetriesPerRequest: 3,

    // Enable offline queue so commands buffer while reconnecting
    enableOfflineQueue: true,

    // Health check
    showFriendlyErrorStack: config.isDevelopment,
});

// ─── Event Listeners ─────────────────────────────────────────────

redisClient.on('connect', () => {
    log.info('Redis connecting...');
});

redisClient.on('ready', () => {
    log.info('Redis connected and ready');
});

redisClient.on('close', () => {
    log.warn('Redis connection closed');
});

redisClient.on('reconnecting', (delayMs: number) => {
    log.info({ delayMs }, 'Redis reconnecting...');
});

redisClient.on('end', () => {
    log.warn('Redis connection ended (no more reconnects)');
});

redisClient.on('error', (err: Error) => {
    // Log but don't crash — ioredis handles retries internally
    log.error({ errMsg: err.message }, 'Redis error');
});

// ─── Connection Lifecycle ────────────────────────────────────────

let isConnected = false;

/**
 * Explicitly connect to Redis. Call once during app startup.
 * Safe to call multiple times — returns early if already connected.
 */
export async function connectRedis(): Promise<void> {
    if (isConnected) {
        log.debug('Redis already connected — skipping');
        return;
    }

    try {
        await redisClient.connect();
        isConnected = true;
        log.info('Redis connection established');
    } catch (err) {
        const error = err as Error;
        log.error({ errMsg: error.message }, 'Failed to connect to Redis');
        // Don't throw — app should continue without cache
        isConnected = false;
    }
}

/**
 * Gracefully disconnect from Redis. Call during app shutdown.
 */
export async function disconnectRedis(): Promise<void> {
    if (!isConnected) return;

    try {
        await redisClient.quit();
        isConnected = false;
        log.info('Redis disconnected gracefully');
    } catch (err) {
        const error = err as Error;
        log.error({ errMsg: error.message }, 'Error disconnecting from Redis');
    }
}

/**
 * Check if Redis is currently connected and ready.
 */
export function isRedisReady(): boolean {
    return isConnected && redisClient.status === 'ready';
}
