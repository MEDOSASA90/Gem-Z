/**
 * =============================================================================
 * GEM Z — Monitored Database Connection Pool
 * =============================================================================
 *
 * Production-grade PostgreSQL connection pool with:
 *   - Real-time metrics tracking (total, idle, waiting)
 *   - Periodic health checks (test query every 30s)
 *   - Auto-reconnect on disconnect
 *   - Structured logging of pool status
 *   - Graceful shutdown support
 *   - Event-based connection monitoring
 *
 * Wraps node-postgres Pool with monitoring and resilience features.
 *
 * @module core/utils/connection-pool
 */

import { Pool, PoolClient, PoolConfig as PgPoolConfig, QueryResult } from 'pg';
import { config } from '../../config';
import { logger, createLogger, logPerf } from '../logging/logger';
import { withRetry, withDBRetry } from './retry';

// ─── Module Logger ───────────────────────────────────────────────────────────

const log = createLogger('connection-pool');

// ─── Types ───────────────────────────────────────────────────────────────────

/** Monitored pool configuration extending pg PoolConfig */
export interface PoolConfig extends PgPoolConfig {
    /** Human-readable pool name for logging/metrics (default: 'default') */
    name?: string;
    /** Interval between health checks in ms (default: 30000) */
    healthCheckIntervalMs?: number;
    /** Interval between metrics logging in ms (default: 60000) */
    metricsLogIntervalMs?: number;
    /** Query used for health checks (default: 'SELECT 1') */
    healthCheckQuery?: string;
    /** Max time to wait for graceful close in ms (default: 5000) */
    gracefulShutdownTimeoutMs?: number;
    /** Whether to auto-reconnect on disconnect (default: true) */
    autoReconnect?: boolean;
    /** Reconnect delay in ms (default: 1000) */
    reconnectDelayMs?: number;
}

/** Connection pool metrics snapshot */
export interface PoolMetrics {
    /** Pool name identifier */
    name: string;
    /** Total connections in the pool */
    totalConnections: number;
    /** Idle (available) connections */
    idleConnections: number;
    /** Clients waiting for a connection */
    waitingClients: number;
    /** Total queries executed */
    totalQueries: number;
    /** Total slow queries (> 1s) */
    slowQueries: number;
    /** Total connection errors */
    connectionErrors: number;
    /** Total connection acquisitions */
    totalAcquisitions: number;
    /** Total connection timeouts */
    acquisitionTimeouts: number;
    /** Health check status */
    healthy: boolean;
    /** Last health check timestamp */
    lastHealthCheck: number | null;
    /** Pool uptime in milliseconds */
    uptimeMs: number;
    /** Pool created timestamp */
    createdAt: number;
}

/** Query timing information */
interface QueryTiming {
    sql: string;
    startTime: number;
    parameters?: unknown[];
}

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_POOL_CONFIG: Required<
    Pick<
        PoolConfig,
        | 'name'
        | 'healthCheckIntervalMs'
        | 'metricsLogIntervalMs'
        | 'healthCheckQuery'
        | 'gracefulShutdownTimeoutMs'
        | 'autoReconnect'
        | 'reconnectDelayMs'
    >
> = {
    name: 'default',
    healthCheckIntervalMs: 30000,
    metricsLogIntervalMs: 60000,
    healthCheckQuery: 'SELECT 1',
    gracefulShutdownTimeoutMs: 5000,
    autoReconnect: true,
    reconnectDelayMs: 1000,
};

// ─── Internal State ──────────────────────────────────────────────────────────

const pools = new Map<string, Pool>();
const poolMetricsMap = new Map<string, PoolMetrics>();
const healthCheckTimers = new Map<string, ReturnType<typeof setInterval>>();
const metricsLogTimers = new Map<string, ReturnType<typeof setInterval>>();
const queryTimings = new WeakMap<PoolClient, QueryTiming>();
let globalQueryCounter = 0;
let globalSlowQueryCounter = 0;

// ─── Pool Creation ───────────────────────────────────────────────────────────

/**
 * Create a monitored PostgreSQL connection pool with health checks,
 * metrics tracking, and auto-reconnect support.
 *
 * @param poolConfig - Pool configuration (extends pg.PoolConfig)
 * @returns The configured Pool instance
 *
 * @example
 *   const pool = createMonitoredPool({
 *     name: 'main',
 *     connectionString: config.databaseUrl,
 *     max: 20,
 *     idleTimeoutMillis: 30000,
 *   });
 *
 *   const result = await pool.query('SELECT * FROM users');
 */
export function createMonitoredPool(poolConfig: PoolConfig): Pool {
    const opts = { ...DEFAULT_POOL_CONFIG, ...poolConfig };
    const poolName = opts.name;

    // Validate connection string
    if (!poolConfig.connectionString && !config.databaseUrl) {
        throw new Error(
            'Connection pool requires a connectionString. ' +
                'Either pass it directly or set DATABASE_URL in your environment.'
        );
    }

    // Merge with defaults
    const finalConfig: PoolConfig = {
        connectionString: config.databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ...poolConfig,
    };

    // Create the pool
    const pool = new Pool(finalConfig);
    pools.set(poolName, pool);

    // Initialize metrics
    const now = Date.now();
    const metrics: PoolMetrics = {
        name: poolName,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        totalQueries: 0,
        slowQueries: 0,
        connectionErrors: 0,
        totalAcquisitions: 0,
        acquisitionTimeouts: 0,
        healthy: true,
        lastHealthCheck: null,
        uptimeMs: 0,
        createdAt: now,
    };
    poolMetricsMap.set(poolName, metrics);

    // ─── Event Handlers ──────────────────────────────────────────────

    /** Fired when a new client connects */
    pool.on('connect', (client: PoolClient) => {
        metrics.totalConnections++;
        log.debug({ pool: poolName, clientPid: (client as any).processID }, 'New pool client connected');

        // Track query start time for slow query detection
        const originalQuery = client.query.bind(client);
        (client as any).query = function (...args: any[]): any {
            const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown';
            const startTime = Date.now();

            queryTimings.set(client, { sql: sql.substring(0, 200), startTime });

            const result = originalQuery(...args);

            // Handle promise-based queries
            if (result && typeof result.then === 'function') {
                return result.then(
                    (res: QueryResult) => {
                        const duration = Date.now() - startTime;
                        globalQueryCounter++;
                        metrics.totalQueries++;

                        if (duration > 1000) {
                            globalSlowQueryCounter++;
                            metrics.slowQueries++;
                            log.warn(
                                { pool: poolName, durationMs: duration, sql: sql.substring(0, 200) },
                                'Slow query detected (%d ms)',
                                duration
                            );
                        }

                        return res;
                    },
                    (err: Error) => {
                        metrics.totalQueries++;
                        globalQueryCounter++;
                        log.error(
                            { pool: poolName, error: err.message, sql: sql.substring(0, 200) },
                            'Query error'
                        );
                        throw err;
                    }
                );
            }

            return result;
        };
    });

    /** Fired when a client is removed from the pool */
    pool.on('remove', () => {
        metrics.totalConnections = Math.max(0, metrics.totalConnections - 1);
        log.debug({ pool: poolName }, 'Pool client removed');
    });

    /** Fired when a client becomes idle */
    pool.on('acquire', () => {
        metrics.totalAcquisitions++;
    });

    /** Fired when a client is returned to the pool */
    pool.on('error', (err: Error) => {
        metrics.connectionErrors++;
        log.error({ pool: poolName, error: err.message }, 'Unexpected pool error');

        if (opts.autoReconnect) {
            log.info({ pool: poolName }, 'Auto-reconnect enabled — attempting reconnect');
            setTimeout(() => {
                performHealthCheck(pool, poolName, metrics).catch((healthErr) => {
                    log.error(
                        { pool: poolName, error: (healthErr as Error).message },
                        'Health check after error failed'
                    );
                });
            }, opts.reconnectDelayMs);
        }
    });

    // ─── Health Check ────────────────────────────────────────────────

    /**
     * Perform a health check by running the test query.
     */
    const performHealthCheck = async (
        targetPool: Pool,
        name: string,
        poolMetrics: PoolMetrics
    ): Promise<void> => {
        try {
            const startTime = Date.now();
            await withDBRetry(() => targetPool.query(opts.healthCheckQuery));
            const duration = Date.now() - startTime;

            poolMetrics.healthy = true;
            poolMetrics.lastHealthCheck = Date.now();

            log.debug(
                { pool: name, durationMs: duration },
                'Health check passed (%d ms)',
                duration
            );
        } catch (err) {
            poolMetrics.healthy = false;
            poolMetrics.connectionErrors++;

            log.error(
                { pool: name, error: (err as Error).message },
                'Health check failed — pool marked unhealthy'
            );
        }
    };

    // Schedule periodic health checks
    const healthTimer = setInterval(() => {
        performHealthCheck(pool, poolName, metrics).catch((err) => {
            log.error({ pool: poolName, error: (err as Error).message }, 'Health check error');
        });
    }, opts.healthCheckIntervalMs);

    healthCheckTimers.set(poolName, healthTimer);

    // Run initial health check
    performHealthCheck(pool, poolName, metrics).catch((err) => {
        log.error({ pool: poolName, error: (err as Error).message }, 'Initial health check failed');
    });

    // ─── Metrics Logging ─────────────────────────────────────────────

    /**
     * Log pool status periodically for monitoring.
     */
    const logPoolStatus = (): void => {
        const poolState = (pool as any)._pendingQueue?.length || 0;
        const all = (pool as any)._clients || [];
        const idle = (pool as any)._idle || [];

        metrics.totalConnections = all.length;
        metrics.idleConnections = idle.length;
        metrics.waitingClients = poolState;
        metrics.uptimeMs = Date.now() - metrics.createdAt;

        const poolStatus = metrics.healthy ? 'healthy' : 'unhealthy';

        log.info(
            {
                pool: poolName,
                status: poolStatus,
                connections: {
                    total: metrics.totalConnections,
                    idle: metrics.idleConnections,
                    waiting: metrics.waitingClients,
                },
                queries: {
                    total: metrics.totalQueries,
                    slow: metrics.slowQueries,
                },
                acquisitions: metrics.totalAcquisitions,
                errors: metrics.connectionErrors,
                uptimeMs: metrics.uptimeMs,
            },
            'Pool %s status: %d total, %d idle, %d waiting [%s]',
            poolName,
            metrics.totalConnections,
            metrics.idleConnections,
            metrics.waitingClients,
            poolStatus
        );
    };

    // Schedule periodic metrics logging
    const metricsTimer = setInterval(logPoolStatus, opts.metricsLogIntervalMs);
    metricsLogTimers.set(poolName, metricsTimer);

    log.info(
        {
            pool: poolName,
            max: finalConfig.max,
            healthCheckIntervalMs: opts.healthCheckIntervalMs,
            metricsLogIntervalMs: opts.metricsLogIntervalMs,
        },
        'Monitored connection pool created'
    );

    return pool;
}

// ─── Metrics Retrieval ───────────────────────────────────────────────────────

/**
 * Get metrics for a specific pool.
 *
 * @param poolName - The name of the pool (default: 'default')
 * @returns Current pool metrics, or null if pool not found
 *
 * @example
 *   const metrics = getPoolMetrics('main');
 *   console.log(`Total connections: ${metrics.totalConnections}`);
 */
export function getPoolMetrics(poolName: string = 'default'): PoolMetrics | null {
    const metrics = poolMetricsMap.get(poolName);
    if (!metrics) {
        log.warn('No metrics found for pool "%s"', poolName);
        return null;
    }

    // Update derived values
    const pool = pools.get(poolName);
    if (pool) {
        const all = (pool as any)._clients || [];
        const idle = (pool as any)._idle || [];
        metrics.totalConnections = all.length;
        metrics.idleConnections = idle.length;
        metrics.waitingClients = (pool as any)._pendingQueue?.length || 0;
        metrics.uptimeMs = Date.now() - metrics.createdAt;
    }

    return { ...metrics };
}

/**
 * Get metrics for all registered pools.
 *
 * @returns Array of metrics for all pools
 */
export function getAllPoolMetrics(): PoolMetrics[] {
    const results: PoolMetrics[] = [];
    for (const name of poolMetricsMap.keys()) {
        const metrics = getPoolMetrics(name);
        if (metrics) {
            results.push(metrics);
        }
    }
    return results;
}

// ─── Health Checks ───────────────────────────────────────────────────────────

/**
 * Check if a specific pool is healthy.
 *
 * @param poolName - The name of the pool (default: 'default')
 * @returns true if the pool is healthy
 */
export function isPoolHealthy(poolName: string = 'default'): boolean {
    const metrics = poolMetricsMap.get(poolName);
    return metrics?.healthy ?? false;
}

/**
 * Check health of all registered pools.
 *
 * @returns Record of pool names to health status
 */
export function getPoolsHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const [name, metrics] of poolMetricsMap) {
        health[name] = metrics.healthy;
    }
    return health;
}

// ─── Pool Management ─────────────────────────────────────────────────────────

/**
 * Get a pool by name.
 *
 * @param poolName - The name of the pool (default: 'default')
 * @returns The Pool instance, or undefined if not found
 */
export function getPool(poolName: string = 'default'): Pool | undefined {
    return pools.get(poolName);
}

/**
 * Get the names of all registered pools.
 */
export function getPoolNames(): string[] {
    return Array.from(pools.keys());
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

/**
 * Gracefully close a specific pool.
 *
 * @param poolName - The name of the pool to close
 * @param timeoutMs - Max time to wait for pending queries
 * @returns Promise that resolves when the pool is closed
 */
export async function closePool(poolName: string = 'default', timeoutMs?: number): Promise<void> {
    const pool = pools.get(poolName);
    if (!pool) {
        log.warn('Cannot close pool "%s" — not found', poolName);
        return;
    }

    const metrics = poolMetricsMap.get(poolName);
    const shutdownTimeout = timeoutMs || metrics?.createdAt
        ? 5000
        : 5000;

    log.info(
        { pool: poolName, timeoutMs: shutdownTimeout },
        'Gracefully closing connection pool'
    );

    // Clear timers
    const healthTimer = healthCheckTimers.get(poolName);
    if (healthTimer) {
        clearInterval(healthTimer);
        healthCheckTimers.delete(poolName);
    }

    const metricsTimer = metricsLogTimers.get(poolName);
    if (metricsTimer) {
        clearInterval(metricsTimer);
        metricsLogTimers.delete(poolName);
    }

    try {
        // Wait for pending queries with timeout
        await Promise.race([
            pool.end(),
            new Promise<void>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Pool close timed out after ${shutdownTimeout}ms`)),
                    shutdownTimeout
                )
            ),
        ]);

        pools.delete(poolName);
        poolMetricsMap.delete(poolName);

        log.info({ pool: poolName }, 'Connection pool closed gracefully');
    } catch (err) {
        log.error(
            { pool: poolName, error: (err as Error).message },
            'Error closing connection pool'
        );

        // Force end
        try {
            await pool.end();
        } catch {
            // Ignore force-end errors
        }

        pools.delete(poolName);
        poolMetricsMap.delete(poolName);
    }
}

/**
 * Gracefully close all registered pools.
 *
 * Call this during application shutdown to ensure all database
 * connections are properly released.
 *
 * @param timeoutMs - Max time to wait per pool
 */
export async function closeAllPools(timeoutMs?: number): Promise<void> {
    log.info('Closing all %d connection pools', pools.size);

    const closePromises = Array.from(pools.keys()).map((name) =>
        closePool(name, timeoutMs).catch((err) => {
            log.error({ pool: name, error: (err as Error).message }, 'Failed to close pool');
        })
    );

    await Promise.all(closePromises);

    log.info('All connection pools closed');
}

// ─── Query Helper ────────────────────────────────────────────────────────────

/**
 * Execute a query on a named pool with automatic retry and timing.
 *
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param poolName - Pool to use (default: 'default')
 * @returns Query result
 */
export async function query<T = any>(
    sql: string,
    params?: unknown[],
    poolName: string = 'default'
): Promise<QueryResult<T>> {
    const pool = pools.get(poolName);
    if (!pool) {
        throw new Error(`Pool '${poolName}' not found`);
    }

    const metrics = poolMetricsMap.get(poolName);
    if (metrics && !metrics.healthy) {
        log.warn({ pool: poolName }, 'Query on unhealthy pool');
    }

    return withDBRetry(() => pool.query<T>(sql, params));
}

/**
 * Execute a query on a named pool with automatic retry and timing,
 * returning the first row or null.
 *
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param poolName - Pool to use (default: 'default')
 * @returns First row, or null if no results
 */
export async function queryOne<T = any>(
    sql: string,
    params?: unknown[],
    poolName: string = 'default'
): Promise<T | null> {
    const result = await query<T>(sql, params, poolName);
    return result.rows[0] ?? null;
}

// ─── Migration ───────────────────────────────────────────────────────────────

/**
 * Migrate from an existing Pool to a monitored pool.
 * Replaces the pool reference while preserving the original config.
 *
 * @param existingPool - The existing Pool instance
 * @param poolConfig - Configuration for the monitored pool
 * @returns The new monitored Pool
 */
export function migrateToMonitoredPool(
    existingPool: Pool,
    poolConfig: PoolConfig
): Pool {
    const newPool = createMonitoredPool(poolConfig);

    // End the old pool
    existingPool.end().catch((err) => {
        log.error({ error: (err as Error).message }, 'Error ending old pool during migration');
    });

    return newPool;
}
