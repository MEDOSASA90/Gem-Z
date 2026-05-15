/**
 * GEM Z — Cache Strategies
 *
 * Reusable caching patterns for common use cases:
 *   - Cache-Aside (Lazy Loading): check cache first, fallback to DB
 *   - Write-Through: write to cache + DB simultaneously
 *   - Domain-specific invalidation helpers (users, gyms, stores)
 */

import {
    cacheGet,
    cacheSet,
    cacheDelete,
    cacheDeletePattern,
    DEFAULT_TTL_SECONDS,
} from '../redis/cache';
import { logger } from '../logging/logger';

const log = logger.child({ module: 'cache-strategies' });

// ─── Cache Key Namespaces ────────────────────────────────────────

export const CacheKeys = {
    user: (id: string) => `user:${id}`,
    userProfile: (id: string) => `user:${id}:profile`,
    userSessions: (id: string) => `user:${id}:sessions`,
    userList: (params: string) => `users:list:${params}`,

    gym: (id: string) => `gym:${id}`,
    gymList: (params: string) => `gyms:list:${params}`,
    gymMembers: (id: string) => `gym:${id}:members`,
    gymStats: (id: string) => `gym:${id}:stats`,

    store: (id: string) => `store:${id}`,
    storeList: (params: string) => `stores:list:${params}`,
    storeProducts: (id: string) => `store:${id}:products`,
    storeOrders: (id: string) => `store:${id}:orders`,

    challenge: (id: string) => `challenge:${id}`,
    challengeLeaderboard: (id: string) => `challenge:${id}:leaderboard`,

    squad: (id: string) => `squad:${id}`,
    recipe: (id: string) => `recipe:${id}`,
    leaderboard: (scope: string) => `leaderboard:${scope}`,

    wallet: (userId: string) => `wallet:${userId}`,
    walletTransactions: (userId: string) => `wallet:${userId}:tx`,

    stats: (scope: string) => `stats:${scope}`,
} as const;

// ════════════════════════════════════════════════════════════════
//  Cache-Aside (Lazy Loading)
// ════════════════════════════════════════════════════════════════

/**
 * Cache-Aside pattern: check cache first, fetch from DB on miss,
 * then populate the cache.
 *
 * Use this for read-heavy data that doesn't change frequently.
 *
 * @param key       Cache key
 * @param fetchFn   Database fetch function (called on cache miss)
 * @param ttl       TTL in seconds (default: 300)
 * @returns         Data from cache or DB
 *
 * @example
 *   const user = await cacheAside(
 *     CacheKeys.user(userId),
 *     () => userRepository.findById(userId),
 *     600
 *   );
 */
export async function cacheAside<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL_SECONDS
): Promise<T> {
    // 1. Try cache first
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
        log.debug({ key, source: 'cache' }, 'Cache-Aside HIT');
        return cached;
    }

    // 2. Cache miss — fetch from DB
    log.debug({ key, source: 'db' }, 'Cache-Aside MISS');
    const startMs = Date.now();
    const data = await fetchFn();
    const fetchMs = Date.now() - startMs;

    // 3. Store in cache (even if null — cache negative results)
    await cacheSet(key, data, ttl);

    log.debug({ key, fetchMs, ttl }, 'Cache-Aside populated');
    return data;
}

/**
 * Cache-Aside with stale-while-revalidate behavior.
 *
 * If cached data is within the soft TTL, return it immediately
 * but trigger a background refresh. If past the hard TTL, block
 * and re-fetch.
 *
 * @param key         Cache key
 * @param fetchFn     DB fetch function
 * @param softTtl     Return stale data within this window (default: 300)
 * @param hardTtl     Force re-fetch after this window (default: 600)
 */
export async function cacheAsideStaleWhileRevalidate<T>(
    key: string,
    fetchFn: () => Promise<T>,
    softTtl: number = DEFAULT_TTL_SECONDS,
    hardTtl: number = DEFAULT_TTL_SECONDS * 2
): Promise<T> {
    const now = Math.floor(Date.now() / 1000);

    // Check cache with metadata
    const entry = await cacheGet<{ data: T; fetchedAt: number }>(key);

    if (entry !== null) {
        const age = now - entry.fetchedAt;

        // Within soft TTL — return immediately, refresh in background
        if (age < softTtl) {
            return entry.data;
        }

        // Between soft and hard TTL — return stale, refresh in background
        if (age < hardTtl) {
            // Fire-and-forget refresh
            cacheSet(
                key,
                { data: await fetchFn(), fetchedAt: now },
                hardTtl
            ).catch(() => {
                /* silently fail background refresh */
            });
            return entry.data;
        }
        // Past hard TTL — fall through to re-fetch
    }

    // Cache miss or stale — fetch and cache
    const data = await fetchFn();
    await cacheSet(key, { data, fetchedAt: now }, hardTtl);
    return data;
}

// ════════════════════════════════════════════════════════════════
//  Write-Through
// ════════════════════════════════════════════════════════════════

/**
 * Write-Through pattern: write to cache and DB simultaneously.
 * The cache is updated before/together with the DB write.
 *
 * Use this when reads must always see the latest data.
 *
 * @param key       Cache key
 * @param value     Value to write (cached as-is)
 * @param writeFn   Database write function
 * @param ttl       TTL in seconds (default: 300)
 * @returns         Result from the DB write
 *
 * @example
 *   const updated = await writeThrough(
 *     CacheKeys.user(userId),
 *     userData,
 *     () => userRepository.update(userId, userData),
 *     600
 *   );
 */
export async function writeThrough<T>(
    key: string,
    value: T,
    writeFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL_SECONDS
): Promise<T> {
    // 1. Write to cache first (optimistic)
    await cacheSet(key, value, ttl);
    log.debug({ key }, 'Write-Through cache updated');

    // 2. Persist to DB
    const startMs = Date.now();
    const result = await writeFn();
    const writeMs = Date.now() - startMs;

    // 3. Update cache with DB result (authoritative)
    await cacheSet(key, result, ttl);

    log.debug({ key, writeMs, ttl }, 'Write-Through complete');
    return result;
}

// ════════════════════════════════════════════════════════════════
//  Write-Around (Cache Bypass on Write)
// ════════════════════════════════════════════════════════════════

/**
 * Write-Around pattern: write to DB only, then invalidate cache.
 *
 * Use this for write-heavy data where caching stale reads is worse
 * than a cache miss.
 *
 * @param writeFn   Database write function
 * @param keysToInvalidate  Cache keys to delete after successful write
 * @returns         Result from the DB write
 *
 * @example
 *   const result = await writeAround(
 *     () => userRepository.update(userId, data),
 *     [CacheKeys.user(userId), CacheKeys.userProfile(userId)]
 *   );
 */
export async function writeAround<T>(
    writeFn: () => Promise<T>,
    keysToInvalidate: string[]
): Promise<T> {
    // 1. Write to DB only
    const result = await writeFn();

    // 2. Invalidate affected cache keys
    for (const key of keysToInvalidate) {
        await cacheDelete(key);
    }

    log.debug(
        { keys: keysToInvalidate },
        'Write-Around — cache invalidated'
    );
    return result;
}

// ════════════════════════════════════════════════════════════════
//  Domain-Specific Cache Invalidation
// ════════════════════════════════════════════════════════════════

/**
 * Invalidate all cache entries related to a specific user.
 * Call after user profile updates, role changes, etc.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
    const pattern = `user:${userId}*`;
    await cacheDeletePattern(pattern);
    log.info({ userId, pattern }, 'User cache invalidated');
}

/**
 * Invalidate all cache entries related to a specific gym.
 * Call after gym data, member list, or stats change.
 */
export async function invalidateGymCache(gymId: string): Promise<void> {
    const pattern = `gym:${gymId}*`;
    await cacheDeletePattern(pattern);
    log.info({ gymId, pattern }, 'Gym cache invalidated');
}

/**
 * Invalidate all cache entries related to a specific store.
 * Call after store data, product catalog, or order changes.
 */
export async function invalidateStoreCache(storeId: string): Promise<void> {
    const pattern = `store:${storeId}*`;
    await cacheDeletePattern(pattern);
    log.info({ storeId, pattern }, 'Store cache invalidated');
}

/**
 * Invalidate all cache entries related to a challenge.
 */
export async function invalidateChallengeCache(challengeId: string): Promise<void> {
    const pattern = `challenge:${challengeId}*`;
    await cacheDeletePattern(pattern);
    log.info({ challengeId, pattern }, 'Challenge cache invalidated');
}

/**
 * Invalidate all cache entries related to a wallet.
 */
export async function invalidateWalletCache(userId: string): Promise<void> {
    const pattern = `wallet:${userId}*`;
    await cacheDeletePattern(pattern);
    log.info({ userId, pattern }, 'Wallet cache invalidated');
}

/**
 * Invalidate all cache entries for the leaderboard scope.
 */
export async function invalidateLeaderboardCache(scope: string): Promise<void> {
    const pattern = `leaderboard:${scope}*`;
    await cacheDeletePattern(pattern);
    log.info({ scope, pattern }, 'Leaderboard cache invalidated');
}

/**
 * Invalidate all cache entries for a squad.
 */
export async function invalidateSquadCache(squadId: string): Promise<void> {
    const pattern = `squad:${squadId}*`;
    await cacheDeletePattern(pattern);
    log.info({ squadId, pattern }, 'Squad cache invalidated');
}

// ════════════════════════════════════════════════════════════════
//  Bulk / Utility Operations
// ════════════════════════════════════════════════════════════════

/**
 * Invalidate multiple cache keys at once.
 */
export async function invalidateKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
        await cacheDelete(key);
    }
    log.debug({ count: keys.length }, 'Bulk cache keys invalidated');
}

/**
 * Invalidate all list-type caches. Use after bulk imports,
 * admin operations, or data migrations.
 */
export async function invalidateAllLists(): Promise<void> {
    const patterns = [
        'users:list:*',
        'gyms:list:*',
        'stores:list:*',
        'challenges:list:*',
        'leaderboard:*',
        'stats:*',
    ];

    for (const pattern of patterns) {
        await cacheDeletePattern(pattern);
    }

    log.info('All list caches invalidated');
}
