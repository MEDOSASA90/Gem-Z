/**
 * =============================================================================
 * GEM Z — Circuit Breaker Pattern
 * =============================================================================
 *
 * Production-grade circuit breaker for external API calls (OpenAI, payment
 * gateways, push notifications). Prevents cascading failures by failing fast
 * when a downstream service is unhealthy.
 *
 * States:
 *   CLOSED    → Normal operation, requests pass through
 *   OPEN      → Failure threshold exceeded, requests fail immediately
 *   HALF_OPEN → Testing if service recovered (limited probe requests)
 *
 * @module core/utils/circuit-breaker
 */

import { logger, createLogger } from '../logging/logger';
import { AppError, ErrorCode, ServiceUnavailableError } from '../errors';

// ─── Module Logger ───────────────────────────────────────────────────────────

const log = createLogger('circuit-breaker');

// ─── Types ───────────────────────────────────────────────────────────────────

/** Circuit breaker state machine states */
export enum CircuitState {
    /** Normal operation — requests pass through */
    CLOSED = 'CLOSED',
    /** Failure threshold exceeded — requests fail fast */
    OPEN = 'OPEN',
    /** Probing — limited requests allowed to test recovery */
    HALF_OPEN = 'HALF_OPEN',
}

/** Circuit breaker configuration options */
export interface CircuitBreakerOptions {
    /** Number of consecutive failures before opening the circuit (default: 5) */
    failureThreshold: number;
    /** Milliseconds to wait before transitioning OPEN → HALF_OPEN (default: 30000) */
    resetTimeoutMs: number;
    /** Max concurrent probe calls in HALF_OPEN state (default: 3) */
    halfOpenMaxCalls: number;
    /** Percentage of half-open calls that must succeed to close (default: 0.5) */
    halfOpenSuccessRate: number;
    /** Timeout for individual wrapped calls in ms (default: 10000) */
    callTimeoutMs: number;
    /** Name for logging/metrics identification */
    name: string;
}

/** Statistics snapshot for the circuit breaker */
export interface CircuitBreakerStats {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    consecutiveFailures: number;
    halfOpenCalls: number;
    halfOpenSuccesses: number;
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
    openedAt: number | null;
}

// ─── Error ───────────────────────────────────────────────────────────────────

/**
 * Thrown when the circuit breaker is OPEN and a call is attempted.
 * Extends AppError for consistent error handling throughout the app.
 */
export class CircuitBreakerOpenError extends AppError {
    readonly circuitName: string;
    readonly resetTimeoutMs: number;
    readonly nextRetryAt: Date;

    constructor(
        circuitName: string,
        resetTimeoutMs: number,
        nextRetryAt: Date
    ) {
        super(
            `Circuit breaker '${circuitName}' is OPEN — service temporarily unavailable. Retry after ${nextRetryAt.toISOString()}`,
            503,
            ErrorCode.SERVICE_UNAVAILABLE,
            true
        );
        this.circuitName = circuitName;
        this.resetTimeoutMs = resetTimeoutMs;
        this.nextRetryAt = nextRetryAt;
    }
}

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
    halfOpenSuccessRate: 0.5,
    callTimeoutMs: 10000,
    name: 'default',
};

// ─── Circuit Breaker Class ───────────────────────────────────────────────────

/**
 * Circuit breaker that wraps external API calls to prevent cascading failures.
 *
 * @example
 *   const cb = new CircuitBreaker({
 *     name: 'openai-api',
 *     failureThreshold: 3,
 *     resetTimeoutMs: 15000,
 *   });
 *
 *   const result = await cb.execute(() => openai.chat.completions.create(params));
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures = 0;
    private successes = 0;
    private consecutiveFailures = 0;
    private lastFailureTime: number | null = null;
    private lastSuccessTime: number | null = null;
    private halfOpenCalls = 0;
    private halfOpenSuccesses = 0;
    private totalCalls = 0;
    private totalFailures = 0;
    private totalSuccesses = 0;
    private openedAt: number | null = null;
    private resetTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly options: CircuitBreakerOptions;
    private readonly log: ReturnType<typeof createLogger>;

    constructor(options: Partial<CircuitBreakerOptions> & { name: string }) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.log = createLogger(`circuit-breaker:${this.options.name}`);
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Execute an async function through the circuit breaker.
     *
     * @param fn - The async function to wrap
     * @returns The result of fn() if successful
     * @throws CircuitBreakerOpenError if circuit is OPEN
     * @throws The original error if fn() fails
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalCalls++;

        // Check if we can allow this call based on current state
        this.checkStateTransition();

        if (this.state === CircuitState.OPEN) {
            const nextRetryAt = new Date(
                (this.lastFailureTime || Date.now()) + this.options.resetTimeoutMs
            );
            this.log.warn(
                {
                    circuit: this.options.name,
                    state: this.state,
                    nextRetryAt: nextRetryAt.toISOString(),
                },
                'Circuit breaker OPEN — rejecting call'
            );
            throw new CircuitBreakerOpenError(
                this.options.name,
                this.options.resetTimeoutMs,
                nextRetryAt
            );
        }

        // In HALF_OPEN state, count probe calls
        if (this.state === CircuitState.HALF_OPEN) {
            if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
                const nextRetryAt = new Date(Date.now() + this.options.resetTimeoutMs);
                this.log.warn(
                    'Half-open probe limit reached — rejecting call'
                );
                throw new CircuitBreakerOpenError(
                    this.options.name,
                    this.options.resetTimeoutMs,
                    nextRetryAt
                );
            }
            this.halfOpenCalls++;
        }

        // Execute the call with timeout
        try {
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure(err);
            throw err;
        }
    }

    /**
     * Get current circuit breaker statistics.
     */
    getStats(): CircuitBreakerStats {
        return {
            name: this.options.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            consecutiveFailures: this.consecutiveFailures,
            halfOpenCalls: this.halfOpenCalls,
            halfOpenSuccesses: this.halfOpenSuccesses,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
            openedAt: this.openedAt,
        };
    }

    /**
     * Get the current state of the circuit breaker.
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Manually force the circuit breaker to a specific state.
     * Primarily used for testing and emergency overrides.
     */
    forceState(newState: CircuitState): void {
        this.log.warn(
            { from: this.state, to: newState },
            'Circuit breaker state manually changed'
        );
        this.state = newState;

        if (newState === CircuitState.CLOSED) {
            this.reset();
        } else if (newState === CircuitState.OPEN) {
            this.scheduleReset();
        } else if (newState === CircuitState.HALF_OPEN) {
            this.halfOpenCalls = 0;
            this.halfOpenSuccesses = 0;
        }
    }

    /**
     * Clean up any pending timers. Call this on shutdown.
     */
    destroy(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
        this.log.debug('Circuit breaker destroyed');
    }

    // ─── Private Methods ─────────────────────────────────────────────────────

    /**
     * Execute fn with a timeout to prevent hanging calls.
     */
    private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(
                    new ServiceUnavailableError(
                        `Circuit breaker call timed out after ${this.options.callTimeoutMs}ms`,
                        ErrorCode.SERVICE_UNAVAILABLE
                    )
                );
            }, this.options.callTimeoutMs);

            fn()
                .then((result) => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch((err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });
    }

    /**
     * Handle successful call.
     */
    private onSuccess(): void {
        this.consecutiveFailures = 0;
        this.successes++;
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenSuccesses++;
            const successRate = this.halfOpenSuccesses / this.halfOpenCalls;

            if (successRate >= this.options.halfOpenSuccessRate) {
                this.log.info(
                    {
                        halfOpenSuccesses: this.halfOpenSuccesses,
                        halfOpenCalls: this.halfOpenCalls,
                        successRate: successRate.toFixed(2),
                    },
                    'Circuit breaker closing — service recovered'
                );
                this.transitionToClosed();
            }
        }
    }

    /**
     * Handle failed call.
     */
    private onFailure(err: unknown): void {
        this.consecutiveFailures++;
        this.failures++;
        this.totalFailures++;
        this.lastFailureTime = Date.now();

        this.log.warn(
            {
                consecutiveFailures: this.consecutiveFailures,
                threshold: this.options.failureThreshold,
                error: (err as Error)?.message,
            },
            'Circuit breaker recorded failure'
        );

        if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in half-open immediately re-opens
            this.log.warn('Failure in HALF_OPEN — circuit re-opening');
            this.transitionToOpen();
            return;
        }

        if (this.consecutiveFailures >= this.options.failureThreshold) {
            this.log.error(
                {
                    consecutiveFailures: this.consecutiveFailures,
                    threshold: this.options.failureThreshold,
                },
                'Failure threshold reached — opening circuit'
            );
            this.transitionToOpen();
        }
    }

    /**
     * Check if enough time has passed to transition OPEN → HALF_OPEN.
     */
    private checkStateTransition(): void {
        if (this.state !== CircuitState.OPEN) {
            return;
        }

        const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
        if (timeSinceLastFailure >= this.options.resetTimeoutMs) {
            this.log.info('Reset timeout elapsed — transitioning to HALF_OPEN');
            this.state = CircuitState.HALF_OPEN;
            this.halfOpenCalls = 0;
            this.halfOpenSuccesses = 0;
        }
    }

    /**
     * Transition to CLOSED state.
     */
    private transitionToClosed(): void {
        this.state = CircuitState.CLOSED;
        this.reset();
        this.openedAt = null;

        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }

        this.log.info('Circuit breaker is now CLOSED');
    }

    /**
     * Transition to OPEN state.
     */
    private transitionToOpen(): void {
        this.state = CircuitState.OPEN;
        this.openedAt = Date.now();
        this.scheduleReset();
    }

    /**
     * Schedule the automatic reset timer (OPEN → HALF_OPEN).
     */
    private scheduleReset(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
        }

        this.resetTimer = setTimeout(() => {
            if (this.state === CircuitState.OPEN) {
                this.log.info('Auto-transitioning OPEN → HALF_OPEN');
                this.state = CircuitState.HALF_OPEN;
                this.halfOpenCalls = 0;
                this.halfOpenSuccesses = 0;
            }
        }, this.options.resetTimeoutMs);
    }

    /**
     * Reset counters (used when transitioning to CLOSED).
     */
    private reset(): void {
        this.failures = 0;
        this.successes = 0;
        this.consecutiveFailures = 0;
        this.halfOpenCalls = 0;
        this.halfOpenSuccesses = 0;
    }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Pre-configured circuit breakers for common external services.
 */
export const circuitBreakers = {
    /** Circuit breaker for OpenAI API calls */
    openAI: new CircuitBreaker({
        name: 'openai-api',
        failureThreshold: 3,
        resetTimeoutMs: 15000,
        halfOpenMaxCalls: 2,
        callTimeoutMs: 30000,
    }),

    /** Circuit breaker for payment gateway calls */
    paymentGateway: new CircuitBreaker({
        name: 'payment-gateway',
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        halfOpenMaxCalls: 3,
        callTimeoutMs: 15000,
    }),

    /** Circuit breaker for push notification service */
    pushNotifications: new CircuitBreaker({
        name: 'push-notifications',
        failureThreshold: 3,
        resetTimeoutMs: 10000,
        halfOpenMaxCalls: 2,
        callTimeoutMs: 5000,
    }),

    /** Circuit breaker for email service */
    email: new CircuitBreaker({
        name: 'email-service',
        failureThreshold: 3,
        resetTimeoutMs: 20000,
        halfOpenMaxCalls: 2,
        callTimeoutMs: 10000,
    }),
};

/**
 * Get statistics for all registered circuit breakers.
 * Useful for health check endpoints.
 */
export function getAllCircuitBreakerStats(): CircuitBreakerStats[] {
    return Object.values(circuitBreakers).map((cb) => cb.getStats());
}
