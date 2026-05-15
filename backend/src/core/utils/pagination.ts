/**
 * GEM Z — Pagination Helper
 *
 * Type-safe pagination for ALL list endpoints.
 * Supports direct DB pagination and Redis-cached pagination.
 */

import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { buildPaginationMeta, PaginationMeta } from './api-response';

export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
}

// ─── Types ──────────────────────────────────────────────────────

export interface PaginationOptions {
    page?: number;          // default: 1
    limit?: number;         // default: 20, max: 100
    orderBy?: string;       // default: 'created_at'
    order?: 'asc' | 'desc'; // default: 'desc'
}

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
    orderBy: string;
    order: 'asc' | 'desc';
}

// ─── Defaults ───────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_ORDER_BY = 'created_at';
const DEFAULT_ORDER: 'asc' | 'desc' = 'desc';

// ─── Sanitize Options ───────────────────────────────────────────

export function sanitizePaginationOptions(options: PaginationOptions): PaginationParams {
    const page = Math.max(1, Number(options.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(options.limit) || DEFAULT_LIMIT));
    // Prevent SQL injection: only allow alphanumeric + underscore for orderBy
    const orderBy = /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(options.orderBy || '')
        ? options.orderBy!
        : DEFAULT_ORDER_BY;
    const order = options.order === 'asc' ? 'asc' : DEFAULT_ORDER;

    return { page, limit, offset: (page - 1) * limit, orderBy, order };
}

// ─── Core Pagination Function ───────────────────────────────────

/**
 * Execute a paginated query against PostgreSQL.
 *
 * @param queryBuilder - Function that receives limit/offset params and returns
 *                       { rowsQuery: string, countQuery: string, params: any[] }
 * @param options - Pagination options (page, limit, orderBy, order)
 * @param db - pg Pool or PoolClient
 * @returns Paginated result with data and pagination metadata
 */
export async function paginate<T>(
    queryBuilder: (params: PaginationParams) => {
        rowsQuery: string;
        countQuery: string;
        params: any[];
    },
    options: PaginationOptions,
    db: Pool | PoolClient
): Promise<PaginatedResult<T>> {
    const params = sanitizePaginationOptions(options);
    const { rowsQuery, countQuery, params: queryParams } = queryBuilder(params);

    // Run count and data queries in parallel
    const [countResult, rowsResult] = await Promise.all([
        db.query(countQuery, queryParams),
        db.query(rowsQuery, [...queryParams, params.limit, params.offset]),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    return {
        data: rowsResult.rows as T[],
        pagination: buildPaginationMeta(total, params.page, params.limit),
    };
}

/**
 * Execute a raw SQL query with pagination.
 *
 * @param baseQuery - The SELECT query (without ORDER BY, LIMIT, OFFSET)
 * @param countQuery - The COUNT query (e.g., SELECT COUNT(*) FROM ...)
 * @param queryParams - Parameters for the base query
 * @param options - Pagination options
 * @param db - pg Pool or PoolClient
 */
export async function paginateRaw<T>(
    baseQuery: string,
    countQuery: string,
    queryParams: any[],
    options: PaginationOptions,
    db: Pool | PoolClient
): Promise<PaginatedResult<T>> {
    const params = sanitizePaginationOptions(options);

    const orderClause = `ORDER BY ${params.orderBy} ${params.order.toUpperCase()}`;
    const paginatedQuery = `${baseQuery} ${orderClause} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

    const [countResult, rowsResult] = await Promise.all([
        db.query(countQuery, queryParams),
        db.query(paginatedQuery, [...queryParams, params.limit, params.offset]),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    return {
        data: rowsResult.rows as T[],
        pagination: buildPaginationMeta(total, params.page, params.limit),
    };
}

/**
 * Paginated query WITH Redis caching support.
 * Checks cache first, falls back to DB, stores result in cache.
 *
 * @param cacheKey - Redis key for caching (e.g., "users:page:1:limit:20")
 * @param queryBuilder - Query builder function
 * @param options - Pagination options
 * @param db - pg Pool or PoolClient
 * @param redis - ioredis client
 * @param ttl - Cache TTL in seconds (default: 60)
 */
export async function paginateWithCache<T>(
    cacheKey: string,
    queryBuilder: (params: PaginationParams) => {
        rowsQuery: string;
        countQuery: string;
        params: any[];
    },
    options: PaginationOptions,
    db: Pool | PoolClient,
    redis: Redis,
    ttl: number = 60
): Promise<PaginatedResult<T>> {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached) as PaginatedResult<T>;
            // Return cached with a flag
            return parsed;
        } catch {
            // Cache corrupted, fetch from DB
        }
    }

    // Fetch from database
    const result = await paginate<T>(queryBuilder, options, db);

    // Store in cache
    try {
        await redis.setex(cacheKey, ttl, JSON.stringify(result));
    } catch {
        // Cache write failure is non-fatal
    }

    return result;
}

/**
 * Invalidate all pagination cache keys matching a pattern.
 * Use this after create/update/delete operations.
 *
 * @param redis - ioredis client
 * @param pattern - Key pattern to invalidate (e.g., "users:*")
 */
export async function invalidatePaginationCache(
    redis: Redis,
    pattern: string
): Promise<void> {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            const pipeline = redis.pipeline();
            for (const key of keys) {
                pipeline.del(key);
            }
            await pipeline.exec();
        }
    } catch {
        // Cache invalidation failure is non-fatal
    }
}
