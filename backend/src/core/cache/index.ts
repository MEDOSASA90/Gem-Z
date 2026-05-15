/**
 * GEM Z — Cache Strategy Exports
 */

export {
    // Cache strategies
    cacheAside,
    cacheAsideStaleWhileRevalidate,
    writeThrough,
    writeAround,

    // Cache key builders
    CacheKeys,

    // Domain-specific invalidation
    invalidateUserCache,
    invalidateGymCache,
    invalidateStoreCache,
    invalidateChallengeCache,
    invalidateWalletCache,
    invalidateLeaderboardCache,
    invalidateSquadCache,

    // Bulk operations
    invalidateKeys,
    invalidateAllLists,
} from './strategies';
