/**
 * =============================================================================
 * GEM Z — Sentry Integration
 * =============================================================================
 *
 * Production-grade error tracking with Sentry. Provides:
 *   - DSN-based initialization from config
 *   - Request ID propagation on every error
 *   - Sensitive data filtering (passwords, tokens, PII)
 *   - User context setting when authenticated
 *   - Breadcrumbs for important operations
 *   - Graceful degradation when Sentry is unavailable
 *
 * @module core/monitoring/sentry
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../../config';
import { logger, createLogger } from '../logging/logger';

// ─── Module Logger ───────────────────────────────────────────────────────────

const log = createLogger('sentry');

// ─── Sensitive Data Filter ───────────────────────────────────────────────────

/**
 * Fields that must be scrubbed from Sentry events before sending.
 * These fields will be replaced with `[Filtered]` in error reports.
 */
const SENSITIVE_FIELDS: string[] = [
    // Authentication
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authToken',
    'jwt',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',

    // Session
    'cookie',
    'sessionId',
    'session_id',

    // Payment / Financial
    'creditCard',
    'credit_card',
    'cardNumber',
    'card_number',
    'cvv',
    'cvc',
    'iban',
    'accountNumber',
    'routingNumber',

    // PII
    'ssn',
    'socialSecurity',
    'dob',
    'dateOfBirth',
    'passport',
    'nationalId',
    'national_id',

    // Wallet / Crypto
    'walletSeed',
    'seedPhrase',
    'mnemonic',

    // Request headers
    'authorization',
    'x-api-key',
    'x-api-key',
];

/**
 * Recursively scrubs sensitive fields from an object.
 * Mutates the object in place for performance.
 */
function scrubSensitiveData<T extends Record<string, unknown>>(obj: T, seen = new WeakSet()): T {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    // Prevent circular reference infinite loops
    if (seen.has(obj)) {
        return obj;
    }
    seen.add(obj);

    for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.some(
            (field) => field.toLowerCase() === lowerKey || lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive) {
            obj[key] = '[Filtered]' as unknown as T[Extract<keyof T, string>];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            scrubSensitiveData(obj[key] as Record<string, unknown>, seen);
        }
    }

    return obj;
}

// ─── Sentry Options ──────────────────────────────────────────────────────────

/**
 * Sentry initialization options.
 */
interface SentryInitOptions {
    /** Enable debug logging from Sentry itself */
    debug?: boolean;
    /** Sample rate for error events (0.0 - 1.0) */
    sampleRate?: number;
    /** Sample rate for performance tracing (0.0 - 1.0) */
    tracesSampleRate?: number;
    /** Sample rate for profiling (0.0 - 1.0) */
    profilesSampleRate?: number;
    /** Maximum number of breadcrumbs per event */
    maxBreadcrumbs?: number;
    /** Environment override */
    environment?: string;
    /** Release version */
    release?: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

let sentryInitialized = false;
let currentRequestId: string | undefined;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize Sentry with DSN from config.
 *
 * If SENTRY_DSN is not set or Sentry is unavailable, logs a warning
 * and continues without error tracking. This ensures the app never
 * crashes due to monitoring misconfiguration.
 *
 * @param options - Optional Sentry configuration overrides
 *
 * @example
 *   import { initSentry } from './core/monitoring/sentry';
 *   initSentry({ tracesSampleRate: 0.2 });
 */
export function initSentry(options: SentryInitOptions = {}): void {
    // Skip if no DSN configured
    if (!config.sentryDsn) {
        log.warn('Sentry DSN not configured — error tracking disabled');
        return;
    }

    // Skip if already initialized
    if (sentryInitialized) {
        log.debug('Sentry already initialized, skipping');
        return;
    }

    try {
        const {
            debug = false,
            sampleRate = 1.0,
            tracesSampleRate = 0.1,
            profilesSampleRate = 0.1,
            maxBreadcrumbs = 100,
            environment = config.nodeEnv,
            release = process.env.npm_package_version || '1.0.0',
        } = options;

        Sentry.init({
            dsn: config.sentryDsn,
            environment,
            release,
            debug,
            sampleRate,
            tracesSampleRate,
            profilesSampleRate,
            maxBreadcrumbs,

            integrations: [
                nodeProfilingIntegration(),
                Sentry.httpIntegration({
                    breadcrumbs: true,
                }),
            ],

            // Global before-send: filter + scrub
            beforeSend(event) {
                // Scrub sensitive data from every event
                if (event.extra) {
                    scrubSensitiveData(event.extra as Record<string, unknown>);
                }
                if (event.contexts) {
                    scrubSensitiveData(event.contexts as Record<string, unknown>);
                }
                if (event.user) {
                    scrubSensitiveData(event.user as unknown as Record<string, unknown>);
                }

                // Attach request ID if available
                if (currentRequestId && event.tags) {
                    event.tags.requestId = currentRequestId;
                }

                // Filter out known non-actionable errors
                const errorMessage = event.exception?.values?.[0]?.value || '';
                const ignoredPatterns = [
                    'ECONNRESET',
                    'EPIPE',
                    'ETIMEDOUT',
                    ' aborted',
                    'timeout of ',
                ];
                if (ignoredPatterns.some((p) => errorMessage.includes(p))) {
                    return null;
                }

                return event;
            },

            // Ignore common health-check routes
            ignoreTransactions: [
                'GET /health',
                'GET /healthz',
                'GET /ready',
                'GET /live',
                'GET /api/health',
            ],
        });

        sentryInitialized = true;
        log.info('Sentry initialized — environment=%s, release=%s', environment, release);
    } catch (err) {
        log.error({ err }, 'Failed to initialize Sentry — continuing without error tracking');
        sentryInitialized = false;
    }
}

// ─── Error Capture ───────────────────────────────────────────────────────────

/**
 * Capture an error in Sentry with optional additional context.
 *
 * If Sentry is not initialized, falls back to structured logging.
 * Automatically attaches the current request ID for traceability.
 *
 * @param error  - The Error object to capture
 * @param context - Optional key-value context to attach
 *
 * @example
 *   try {
 *     await riskyOperation();
 *   } catch (err) {
 *     captureError(err as Error, { userId: '123', action: 'withdrawal' });
 *   }
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
    if (!error) {
        log.warn('captureError called with no error');
        return;
    }

    // Scrub context before sending
    const safeContext = context ? scrubSensitiveData({ ...context }) : undefined;

    if (sentryInitialized) {
        Sentry.withScope((scope) => {
            // Attach request ID
            if (currentRequestId) {
                scope.setTag('requestId', currentRequestId);
            }

            // Attach context as extra data
            if (safeContext) {
                for (const [key, value] of Object.entries(safeContext)) {
                    scope.setExtra(key, value);
                }
            }

            // Set fingerprint for grouping similar errors
            scope.setFingerprint([error.name, error.message]);

            Sentry.captureException(error);
        });
    }

    // Always log locally as well
    log.error(
        {
            err: error,
            requestId: currentRequestId,
            ...safeContext,
        },
        `[Sentry] Captured error: ${error.name}: ${error.message}`
    );
}

// ─── User Context ────────────────────────────────────────────────────────────

/**
 * Set Sentry user context for the current scope.
 * Call this when a user authenticates to associate errors with them.
 *
 * @param userId - Unique user identifier (UUID or numeric ID)
 * @param email  - User's email address
 * @param role   - User's role (e.g., 'trainee', 'trainer', 'admin', 'gym_owner')
 *
 * @example
 *   // After successful login
 *   setSentryUser(user.id, user.email, user.role);
 */
export function setSentryUser(userId: string, email: string, role: string): void {
    if (!userId) {
        log.warn('setSentryUser called with empty userId');
        return;
    }

    const userContext: Sentry.User = {
        id: userId,
        email: email || undefined,
        role: role || undefined,
    };

    if (sentryInitialized) {
        Sentry.setUser(userContext);
    }

    log.debug({ userId, role }, 'Sentry user context set');
}

/**
 * Clear the current user context from Sentry.
 * Call this on logout to prevent attributing subsequent errors
 * to the previously authenticated user.
 */
export function clearSentryUser(): void {
    if (sentryInitialized) {
        Sentry.setUser(null);
    }
    log.debug('Sentry user context cleared');
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

/**
 * Add a breadcrumb to Sentry's trail for the current scope.
 * Breadcrumbs help reconstruct the sequence of events leading to an error.
 *
 * @param message  - Human-readable description of the event
 * @param category - Logical category (e.g., 'auth', 'wallet', 'http', 'db')
 * @param data     - Optional structured data associated with the event
 *
 * @example
 *   addBreadcrumb('Wallet top-up initiated', 'wallet', { amount: 100, gateway: 'stripe' });
 *   addBreadcrumb('Payment webhook received', 'http', { event: 'charge.succeeded' });
 */
export function addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>
): void {
    if (!message) {
        log.warn('addBreadcrumb called with empty message');
        return;
    }

    // Scrub data before adding
    const safeData = data ? scrubSensitiveData({ ...data }) : undefined;

    if (sentryInitialized) {
        Sentry.addBreadcrumb({
            message,
            category,
            data: safeData,
            level: 'info',
            timestamp: Date.now() / 1000,
        });
    }

    // Also log as structured log for local traceability
    log.debug({ category, ...safeData }, `[Breadcrumb] ${category}: ${message}`);
}

// ─── Request ID Management ───────────────────────────────────────────────────

/**
 * Set the current request ID for Sentry scope.
 * Called automatically by middleware; rarely needs manual invocation.
 *
 * @param requestId - The request ID to attach to subsequent Sentry events
 */
export function setSentryRequestId(requestId: string): void {
    currentRequestId = requestId;
    if (sentryInitialized) {
        Sentry.setTag('requestId', requestId);
    }
}

/**
 * Get the currently set request ID.
 */
export function getSentryRequestId(): string | undefined {
    return currentRequestId;
}

// ─── Transaction / Performance ───────────────────────────────────────────────

/**
 * Start a Sentry performance transaction for a specific operation.
 *
 * @param name - Transaction name (e.g., 'wallet.withdrawal')
 * @param op   - Operation category (e.g., 'http', 'db', 'function')
 * @returns The transaction object, or null if Sentry is not initialized
 *
 * @example
 *   const tx = startTransaction('process-payment', 'wallet');
 *   try {
 *     await processPayment();
 *     tx?.finish();
 *   } catch (err) {
 *     tx?.setStatus('internal_error');
 *     tx?.finish();
 *     throw err;
 *   }
 */
export function startTransaction(
    name: string,
    op: string
): ReturnType<typeof Sentry.startTransaction> | null {
    if (!sentryInitialized) {
        return null;
    }

    const transaction = Sentry.startTransaction({ name, op });
    Sentry.getCurrentHub().configureScope((scope) => scope.setSpan(transaction));
    return transaction;
}

// ─── Flush & Shutdown ────────────────────────────────────────────────────────

/**
 * Flush pending Sentry events before shutdown.
 * Call this during graceful shutdown to ensure all errors are sent.
 *
 * @param timeoutMs - Maximum time to wait for flush (default: 2000ms)
 * @returns Promise that resolves when flush completes or times out
 */
export async function flushSentry(timeoutMs: number = 2000): Promise<void> {
    if (!sentryInitialized) {
        return;
    }

    try {
        await Sentry.close(timeoutMs);
        log.info('Sentry flushed successfully');
    } catch (err) {
        log.error({ err }, 'Failed to flush Sentry events');
    }
}

// ─── Status Check ────────────────────────────────────────────────────────────

/**
 * Check whether Sentry is currently initialized and active.
 */
export function isSentryInitialized(): boolean {
    return sentryInitialized;
}
