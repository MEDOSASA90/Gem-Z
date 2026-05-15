/**
 * GEM Z — Cache Helper Functions
 *
 * High-level cache operations with JSON serialization, TTL support,
 * and graceful fallback when Redis is unavailable.
 *
 * All operations are safe: if Redis is down, they return null / void
 * without throwing, so the app continues serving from the database.
 */

import { redisClient, isRedisReady } from './client';
import { logger } from '../logging/logger';

const log = logger.child({ module: 'cache' });

// ─── Constants ───────────────────────────────────────────────────

/** Default TTL: 5 minutes (300 seconds) */
export const DEFAULT_TTL_SECONDS = 300;

/** Sentinel value for null cache entries (distinguish from missing keys) */
const NULL_PLACEHOLDER = '__CACHE_NULL__';

// ─── Helper: safe Redis execution ────────────────────────────────

/**
 * Execute a Redis command safely. If Redis is unavailable,
 * log a warning once and return the fallback value.
 */
async function safeExec<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback: T
): Promise<T> {
    if (!isRedisReady()) {
        return fallback;
    }

    try {
        return await fn();
    } catch (err) {
        const error = err as Error;
        log.warn(
            { operation, errMsg: error.message },
            'Cache operation failed — falling back'
        );
        return fallback;
    }
}

// ─── Core Cache Operations ───────────────────────────────────────

/**
 * Get a cached value by key. Returns `null` if missing or on error.
 *
 * @example
 *   const user = await cacheGet<User>('user:42');
 *   if (user) { /* use cached value *\/ }
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    return safeExec('GET', async () => {
        const raw = await redisClient.get(key);

        if (raw === null) {
            return null; // cache miss
        }

        if (raw === NULL_PLACEHOLDER) {
            return null as T; // cached null value
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            // If not valid JSON, return the raw string
            return raw as unknown as T;
        }
    }, null);
}

/**
 * Set a value in the cache with optional TTL.
 *
 * @param key       Cache key
 * @param value     Value to cache (any JSON-serializable type)
 * @param ttlSeconds Time-to-live in seconds (default: 300)
 *
 * @example
 *   await cacheSet('user:42', user, 600); // cache for 10 min
 */
export async function cacheSet(
    key: string,
    value: any,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
    return safeExec('SET', async () => {
        const serialized =
            value === null || value === undefined
                ? NULL_PLACEHOLDER
                : JSON.stringify(value);

        if (ttlSeconds > 0) {
            await redisClient.setex(key, ttlSeconds, serialized);
        } else {
            await redisClient.set(key, serialized);
        }

        log.debug({ key, ttlSeconds }, 'Cache SET');
    }, undefined);
}

/**
 * Delete a single cache key.
 *
 * @example
 *   await cacheDelete('user:42');
 */
export async function cacheDelete(key: string): Promise<void> {
    return safeExec('DEL', async () => {
        await redisClient.del(key);
        log.debug({ key }, 'Cache DEL');
    }, undefined);
}

/**
 * Delete all keys matching a glob pattern.
 * Uses SCAN + DEL to avoid blocking Redis on large key spaces.
 *
 * @param pattern  Glob pattern, e.g. `"users:*"`, `"gyms:*"`
 *
 * @example
 *   await cacheDeletePattern('users:*');
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
    return safeExec('DEL_PATTERN', async () => {
        const stream = redisClient.scanStream({
            match: pattern,
            count: 100,
        });

        let deleted = 0;
        const pipeline = redisClient.pipeline();

        stream.on('data', (keys: string[]) => {
            if (keys.length === 0) return;

            for (const key of keys) {
                pipeline.del(key);
            }
            deleted += keys.length;
        });

        await new Promise<void>((resolve, reject) => {
            stream.on('end', () => {
                pipeline.exec().then(() => resolve()).catch(reject);
            });
            stream.on('error', (err: Error) => reject(err));
        });

        log.info({ pattern, deleted }, 'Cache pattern deleted');
    }, undefined);
}

/**
 * Flush the entire Redis database. **Use with extreme caution.**
 * In production, this only flushes the currently selected DB (default 0).
 */
export async function cacheFlush(): Promise<void> {
    return safeExec('FLUSHDB', async () => {
        await redisClient.flushdb();
        log.warn('Cache FLUSHDB executed — all keys removed');
    }, undefined);
}

// ─── Convenience: Get-or-Set ─────────────────────────────────────

/**
 * Get a value from cache, or compute + cache it if missing.
 * This is the cache-aside pattern in a single call.
 *
 * @param key       Cache key
 * @param fetchFn   Function to compute the value on cache miss
 * @param ttlSeconds Time-to-live in seconds (default: 300)
 * @returns         Cached or freshly computed value
 *
 * @example
 *   const user = await cacheGetOrSet('user:42', () => db.getUser(42), 600);
 */
export async function cacheGetOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
    const cached = await cacheGet<T>(key);

    if (cached !== null) {
        return cached;
    }

    const value = await fetchFn();
    await cacheSet(key, value, ttlSeconds);
    return value;
}
