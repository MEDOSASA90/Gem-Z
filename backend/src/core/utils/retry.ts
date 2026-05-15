/**
 * =============================================================================
 * GEM Z — Retry with Exponential Backoff
 * =============================================================================
 *
 * Production-grade retry utility with exponential backoff, jitter,
 * and selective retry based on error types.
 *
 * Use for:
 *   - External API calls (OpenAI, payment gateways)
 *   - Database connections (ECONNREFUSED, ETIMEDOUT)
 *   - Redis reconnections
 *   - Any transient network operation
 *
 * @module core/utils/retry
 */

import { logger, createLogger } from '../logging/logger';
import { ServiceUnavailableError, ErrorCode } from '../errors';

// ─── Module Logger ───────────────────────────────────────────────────────────

const log = createLogger('retry');

// ─── Types ───────────────────────────────────────────────────────────────────

/** Error codes that are considered retryable (transient network errors) */
export const RETRYABLE_ERROR_CODES: string[] = [
    // TCP / Connection errors
    'ECONNREFUSED',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'ECONNABORTED',

    // HTTP status codes (as strings)
    'ECONNRESET',
    'EADDRINUSE',

    // Database errors
    'PROTOCOL_CONNECTION_LOST',
    'ER_LOCK_WAIT_TIMEOUT',
    'ER_LOCK_DEADLOCK',
    '08000', // SQL connection exception
    '08003', // SQL connection does not exist
    '08006', // SQL connection failure

    // Timeout errors
    'TIMEOUT',
    'REQUEST_TIMEOUT',
    'RESPONSE_TIMEOUT',

    // AWS / Cloud errors
    'ThrottlingException',
    'TooManyRequestsException',
    'ServiceUnavailable',
    'ServiceUnavailableException',
    'InternalServerError',
    'ProvisionedThroughputExceededException',

    // Rate limiting
    'RATE_LIMIT_EXCEEDED',

    // Generic
    'NETWORK_ERROR',
    'TEMPORARY_REDIRECT',
];

/** Configuration options for retry behavior */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Initial delay in milliseconds (default: 1000) */
    baseDelayMs: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelayMs: number;
    /** Exponential backoff multiplier (default: 2) */
    backoffMultiplier: number;
    /** Add random jitter to prevent thundering herd (default: true) */
    jitter: boolean;
    /** Jitter factor: delay variance ±this percentage (default: 0.25) */
    jitterFactor: number;
    /** Custom predicate to determine if an error is retryable */
    isRetryable?: (error: unknown) => boolean;
    /** Callback invoked on each retry attempt */
    onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
    /** Operation name for logging */
    operationName: string;
}

/** Statistics for a retry operation */
export interface RetryStats {
    operationName: string;
    attempts: number;
    totalDurationMs: number;
    success: boolean;
    lastError?: string;
}

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    jitterFactor: 0.25,
    operationName: 'unknown',
};

// ─── Error Classification ────────────────────────────────────────────────────

/**
 * Default predicate to determine if an error is retryable.
 * Checks error code, message, and HTTP status against known retryable patterns.
 */
export function defaultIsRetryable(error: unknown): boolean {
    if (!error) {
        return false;
    }

    // Check error code property
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' && RETRYABLE_ERROR_CODES.includes(code)) {
        return true;
    }
    if (typeof code === 'number' && (code === 429 || code >= 500)) {
        return true;
    }

    // Check error message for known patterns
    const message = (error as Error)?.message || String(error);
    const retryablePatterns = [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'timeout',
        'network',
        'temporarily unavailable',
        'rate limit',
        'too many requests',
        'connection refused',
        'connection reset',
    ];
    if (retryablePatterns.some((p) => message.toLowerCase().includes(p.toLowerCase()))) {
        return true;
    }

    // Check statusCode on the error object
    const statusCode = (error as Record<string, unknown>).statusCode;
    if (typeof statusCode === 'number' && (statusCode === 429 || statusCode >= 500)) {
        return true;
    }

    // Check status on the error object
    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number' && (status === 429 || status >= 500)) {
        return true;
    }

    return false;
}

// ─── Delay Calculation ───────────────────────────────────────────────────────

/**
 * Calculate the delay for a given retry attempt using exponential backoff.
 *
 * Formula: min(baseDelay * (multiplier ^ attempt), maxDelay)
 * With jitter: delay ± (delay * jitterFactor * random(-1, 1))
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
    // Exponential backoff: baseDelay * multiplier^attempt
    const exponential = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt);

    // Cap at maxDelay
    const capped = Math.min(exponential, options.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (options.jitter) {
        const jitterAmount = capped * options.jitterFactor * (Math.random() * 2 - 1);
        return Math.max(0, Math.round(capped + jitterAmount));
    }

    return Math.round(capped);
}

// ─── Core Retry Function ─────────────────────────────────────────────────────

/**
 * Execute an async function with automatic retry on transient failures.
 *
 * Uses exponential backoff with jitter to prevent thundering herd.
 * Only retries on retryable errors (connection issues, timeouts, 5xx, 429).
 *
 * @param fn      - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of fn() if eventually successful
 * @throws The last error if all retries are exhausted
 *
 * @example
 *   const result = await withRetry(
 *     () => openai.chat.completions.create(params),
 *     { maxRetries: 3, operationName: 'openai.chat' }
 *   );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
): Promise<T> {
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const isRetryable = opts.isRetryable || defaultIsRetryable;
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            const result = await fn();

            // Log success if we retried
            if (attempt > 0) {
                const totalDuration = Date.now() - startTime;
                log.info(
                    {
                        operation: opts.operationName,
                        attempts: attempt + 1,
                        totalDurationMs: totalDuration,
                    },
                    `Operation '${opts.operationName}' succeeded after ${attempt + 1} attempts`
                );
            }

            return result;
        } catch (error) {
            lastError = error;

            // Don't retry on the last attempt
            if (attempt >= opts.maxRetries) {
                break;
            }

            // Check if this error is retryable
            if (!isRetryable(error)) {
                log.debug(
                    {
                        operation: opts.operationName,
                        error: (error as Error)?.message,
                        code: (error as Record<string, unknown>)?.code,
                    },
                    `Non-retryable error — giving up immediately`
                );
                throw error;
            }

            // Calculate delay for next attempt
            const delayMs = calculateDelay(attempt, opts);

            log.warn(
                {
                    operation: opts.operationName,
                    attempt: attempt + 1,
                    maxRetries: opts.maxRetries,
                    delayMs,
                    error: (error as Error)?.message,
                    code: (error as Record<string, unknown>)?.code,
                },
                `Retry ${attempt + 1}/${opts.maxRetries} for '${opts.operationName}' in ${delayMs}ms`
            );

            // Invoke callback if provided
            if (opts.onRetry) {
                try {
                    opts.onRetry(attempt + 1, delayMs, error);
                } catch {
                    // Callback errors should not break the retry loop
                }
            }

            // Wait before next attempt
            await sleep(delayMs);
        }
    }

    // All retries exhausted
    const totalDuration = Date.now() - startTime;
    const finalError = lastError instanceof Error ? lastError : new Error(String(lastError));

    log.error(
        {
            operation: opts.operationName,
            attempts: opts.maxRetries + 1,
            totalDurationMs: totalDuration,
            error: finalError.message,
        },
        `Operation '${opts.operationName}' failed after ${opts.maxRetries + 1} attempts`
    );

    throw lastError;
}

// ─── Database-Specific Retry ─────────────────────────────────────────────────

/** Pre-configured options for database connection retries */
export const DB_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitter: true,
    jitterFactor: 0.2,
    operationName: 'database',
};

/**
 * Execute a database operation with retry logic optimized for DB failures.
 *
 * Tuned for PostgreSQL connection issues:
 *   - More retries (5) since DB recovery can take time
 *   - Shorter base delay (500ms) for faster initial retry
 *   - Lower max delay (10s) to avoid excessive waiting
 *
 * @param fn - The database operation to execute
 * @returns The result of fn() if eventually successful
 * @throws The last error if all retries are exhausted
 *
 * @example
 *   const users = await withDBRetry(() => db.query('SELECT * FROM users'));
 */
export async function withDBRetry<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, {
        ...DB_RETRY_OPTIONS,
        isRetryable: (error: unknown): boolean => {
            // Database-specific retryable errors
            const dbRetryableCodes = [
                'ECONNREFUSED',
                'ECONNRESET',
                'ETIMEDOUT',
                'EPIPE',
                'PROTOCOL_CONNECTION_LOST',
                '08000',
                '08003',
                '08006',
                '08001',
                '08004',
                'ER_LOCK_WAIT_TIMEOUT',
                'ER_LOCK_DEADLOCK',
                '55P03', // lock_not_available
                '40001', // serialization_failure
            ];

            const code = (error as Record<string, unknown>)?.code;
            const message = (error as Error)?.message || '';

            if (typeof code === 'string' && dbRetryableCodes.includes(code)) {
                return true;
            }

            // Check for PostgreSQL-specific messages
            const pgPatterns = [
                'Connection terminated unexpectedly',
                'server closed the connection unexpectedly',
                'too many connections',
                'the database system is starting up',
                'the database system is shutting down',
                'connection timeout',
                'Connection pool',
                'Client has encountered a connection error',
            ];

            return pgPatterns.some((p) => message.includes(p));
        },
    });
}

// ─── HTTP-Specific Retry ─────────────────────────────────────────────────────

/** Pre-configured options for HTTP API retries */
export const HTTP_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    jitter: true,
    jitterFactor: 0.25,
    operationName: 'http-request',
};

/**
 * Execute an HTTP request with retry logic.
 *
 * Retries on:
 *   - 5xx server errors
 *   - 429 rate limit (with implied backoff)
 *   - Network-level errors (ECONNREFUSED, ETIMEDOUT, etc.)
 *
 * @param fn - The HTTP request to execute
 * @param options - Optional retry configuration overrides
 * @returns The result of fn() if eventually successful
 */
export async function withHTTPRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
): Promise<T> {
    return withRetry(fn, {
        ...HTTP_RETRY_OPTIONS,
        ...options,
        isRetryable: (error: unknown): boolean => {
            // Check HTTP status
            const status =
                (error as Record<string, unknown>)?.statusCode ||
                (error as Record<string, unknown>)?.status;
            if (typeof status === 'number' && (status === 429 || status >= 500)) {
                return true;
            }

            // Check error code
            const code = (error as Record<string, unknown>)?.code;
            if (typeof code === 'string' && RETRYABLE_ERROR_CODES.includes(code)) {
                return true;
            }

            // Check for HTTP-specific error patterns
            const message = (error as Error)?.message || '';
            const httpPatterns = ['timeout', 'ECONN', 'EPIPE', 'network', 'ENOTFOUND'];
            return httpPatterns.some((p) => message.toLowerCase().includes(p.toLowerCase()));
        },
    });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Promise-based sleep utility.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Retry Stats Helper ──────────────────────────────────────────────────────

/**
 * Wrap a function to collect retry statistics.
 *
 * @param fn      - The function to wrap
 * @param options - Retry configuration
 * @returns Tuple of [result, stats]
 *
 * @example
 *   const [result, stats] = await withRetryStats(
 *     () => fetchData(),
 *     { operationName: 'fetch' }
 *   );
 *   console.log(`Took ${stats.attempts} attempts`);
 */
export async function withRetryStats<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
): Promise<[T, RetryStats]> {
    const stats: RetryStats = {
        operationName: options?.operationName || 'unknown',
        attempts: 0,
        totalDurationMs: 0,
        success: false,
    };

    const startTime = Date.now();
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

    try {
        const result = await withRetry(fn, {
            ...opts,
            onRetry: (attempt, delayMs, error) => {
                stats.attempts = attempt;
                if (opts.onRetry) {
                    opts.onRetry(attempt, delayMs, error);
                }
            },
        });

        stats.attempts = stats.attempts || 1;
        stats.totalDurationMs = Date.now() - startTime;
        stats.success = true;

        return [result, stats];
    } catch (error) {
        stats.attempts = stats.attempts || (opts.maxRetries + 1);
        stats.totalDurationMs = Date.now() - startTime;
        stats.success = false;
        stats.lastError = (error as Error)?.message || String(error);

        throw error;
    }
}
