/**
 * GEM Z — Graceful Shutdown Handler
 *
 * Handles SIGTERM/SIGINT signals for zero-downtime deployments.
 * Sequence: stop accepting connections → finish current requests →
 * close Redis → close queues → exit.
 *
 * Usage:
 *   import { setupGracefulShutdown } from './core/utils/graceful-shutdown';
 *   setupGracefulShutdown(server, redisClient, [emailQueue, aiQueue]);
 */

import http from 'http';
import { logger } from '../logging/logger';
import { disconnectRedis, redisClient } from '../redis/client';
import { destroyKnex } from '../database/knex';

const log = logger.child({ module: 'graceful-shutdown' });

interface ShutdownOptions {
    /** Timeout in ms to force exit if graceful shutdown hangs (default: 30000) */
    timeoutMs?: number;
    /** Extra cleanup functions to run before exit */
    extraCleanup?: (() => Promise<void>)[];
}

let isShuttingDown = false;

/**
 * Set up graceful shutdown handlers for SIGTERM and SIGINT.
 *
 * @param server - HTTP server instance
 * @param queues - BullMQ Queue instances to close
 * @param options - Optional configuration
 */
export function setupGracefulShutdown(
    server: http.Server,
    queues: { close: () => Promise<void> }[] = [],
    options: ShutdownOptions = {}
): void {
    const { timeoutMs = 30000, extraCleanup = [] } = options;

    const handleSignal = async (signal: string): Promise<void> => {
        if (isShuttingDown) {
            log.info('Shutdown already in progress...');
            return;
        }
        isShuttingDown = true;

        log.info({ signal }, `Received ${signal}. Starting graceful shutdown...`);

        // Hard timeout — force exit if graceful shutdown hangs
        const forceExitTimeout = setTimeout(() => {
            log.error(
                { timeoutMs },
                'Graceful shutdown timed out. Forcing exit.'
            );
            process.exit(1);
        }, timeoutMs);

        try {
            // 1. Stop accepting new HTTP connections
            await new Promise<void>((resolve) => {
                server.close((err) => {
                    if (err) {
                        log.error({ err: err.message }, 'Error closing HTTP server');
                    } else {
                        log.info('HTTP server closed — no new connections accepted.');
                    }
                    resolve();
                });

                // Force resolve if server.close hangs (e.g., stuck connections)
                setTimeout(resolve, 5000);
            });

            // 2. Close Knex connection pool
            try {
                await destroyKnex();
                log.info('Database connection pool closed.');
            } catch (err) {
                log.error({ err: (err as Error).message }, 'Error closing Knex pool');
            }

            // 3. Disconnect Redis
            try {
                await disconnectRedis();
                log.info('Redis disconnected gracefully.');
            } catch (err) {
                log.error({ err: (err as Error).message }, 'Error disconnecting Redis');
            }

            // 4. Close all BullMQ queues
            if (queues.length > 0) {
                await Promise.all(
                    queues.map(async (queue, i) => {
                        try {
                            await queue.close();
                            log.info({ queueIndex: i }, 'Queue closed');
                        } catch (err) {
                            log.error(
                                { queueIndex: i, err: (err as Error).message },
                                'Error closing queue'
                            );
                        }
                    })
                );
                log.info('All queues closed.');
            }

            // 5. Run extra cleanup functions
            for (const cleanup of extraCleanup) {
                try {
                    await cleanup();
                } catch (err) {
                    log.error({ err: (err as Error).message }, 'Extra cleanup failed');
                }
            }

            // 6. Clear force-exit timeout and exit cleanly
            clearTimeout(forceExitTimeout);
            log.info('Graceful shutdown complete. Exiting.');
            process.exit(0);
        } catch (err) {
            log.error({ err: (err as Error).message }, 'Unexpected error during shutdown');
            clearTimeout(forceExitTimeout);
            process.exit(1);
        }
    };

    // Register signal handlers
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGINT', () => handleSignal('SIGINT'));

    // Also handle uncaught exceptions by triggering shutdown
    process.on('uncaughtException', (err: Error) => {
        log.error({ err: err.message, stack: err.stack }, 'Uncaught exception');
        handleSignal('uncaughtException');
    });

    process.on('unhandledRejection', (reason: unknown) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        log.error({ err: err.message }, 'Unhandled rejection');
        // Don't trigger shutdown for unhandled rejections — let the app continue
    });
}

/**
 * Check if the application is currently shutting down.
 * Use this to short-circuit new work during shutdown.
 */
export function isShuttingDownNow(): boolean {
    return isShuttingDown;
}

/**
 * Health check that returns false during shutdown.
 * Use in load balancer health checks.
 */
export function isHealthy(): boolean {
    return !isShuttingDown;
}
