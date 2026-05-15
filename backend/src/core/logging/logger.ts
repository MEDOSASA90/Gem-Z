/**
 * GEM Z — Structured Logging (Pino)
 *
 * Fast JSON logger with environment-aware formatting:
 *   - Development: pretty-printed, human-readable
 *   - Production:  JSON lines for log aggregation (Datadog, ELK, etc.)
 *
 * Features:
 *   - Child loggers with module context
 *   - Automatic sensitive data redaction
 *   - Request ID propagation
 *   - Log level control via LOG_LEVEL env var
 */

import pino from 'pino';
import { config } from '../../config';

// ─── Sensitive Field Redaction ───────────────────────────────────

/**
 * Fields that must NEVER appear in logs.
 * Pino's redaction replaces them with `[Redacted]`.
 */
const SENSITIVE_FIELDS = [
    // Auth tokens
    '*.password',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.authToken',
    '*.jwt',
    '*.secret',
    '*.apiKey',
    '*.api_key',
    '*.privateKey',
    '*.private_key',

    // Session
    '*.cookie',
    '*.sessionId',
    '*.session_id',

    // Payment
    '*.creditCard',
    '*.credit_card',
    '*.cardNumber',
    '*.card_number',
    '*.cvv',
    '*.cvc',
    '*.iban',
    '*.accountNumber',
    '*.routingNumber',

    // PII
    '*.ssn',
    '*.socialSecurity',
    '*.dob',
    '*.dateOfBirth',
    '*.passport',

    // Request headers that may contain tokens
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'res.headers["set-cookie"]',

    // Wallet / crypto
    '*.walletSeed',
    '*.seedPhrase',
    '*.mnemonic',
    '*.private_key',
];

// ─── Logger Configuration ────────────────────────────────────────

const LOG_LEVEL = (process.env.LOG_LEVEL ||
    (config.isDevelopment ? 'debug' : 'info')
) as pino.LevelWithSilent;

/**
 * Base Pino logger instance.
 * Import this and use directly, or create child loggers.
 */
export const logger = pino({
    // Log level
    level: LOG_LEVEL,

    // In development: pretty-print. In production: JSON.
    transport: config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
                ignore: 'pid,hostname',
                singleLine: false,
                levelFirst: false,
                messageFormat: '{module} | {msg}',
            },
        }
        : undefined,

    // Base fields added to every log entry
    base: {
        env: config.nodeEnv,
        service: 'gemz-backend',
        version: process.env.npm_package_version || '1.0.0',
    },

    // Redaction — NEVER log sensitive data
    redact: {
        paths: SENSITIVE_FIELDS,
        censor: '[Redacted]',
        remove: false,
    },

    // Hooks for custom processing
    hooks: {
        // Ensure logMethod always exists even if not called
        logMethod(inputArgs: any[], method: any, level: number) {
            return method.apply(this, inputArgs);
        },
    },

    // Formatting
    formatters: {
        level(label: string) {
            return { level: label.toUpperCase() };
        },
    },

    // Timestamp
    timestamp: pino.stdTimeFunctions.isoTime,
});

// ─── Convenience Exports ─────────────────────────────────────────

/**
 * Create a child logger bound to a specific module.
 *
 * @example
 *   const log = logger.child({ module: 'auth' });
 *   log.info('User logged in');
 *   // => { "level":"INFO", "module":"auth", "msg":"User logged in", ... }
 */
export function createLogger(moduleName: string): pino.Logger {
    return logger.child({ module: moduleName });
}

/**
 * Set log level at runtime (useful for debugging without restart).
 */
export function setLogLevel(level: pino.LevelWithSilent): void {
    logger.level = level;
}

/**
 * Log a performance metric. Structured for ingestion by APM tools.
 *
 * @example
 *   logPerf('db_query', { table: 'users', durationMs: 45 });
 */
export function logPerf(
    operation: string,
    meta: { durationMs: number; [key: string]: any }
): void {
    logger.info(
        { ...meta, type: 'perf', operation },
        `[PERF] ${operation} took ${meta.durationMs}ms`
    );
}

/**
 * Log an audit event. Use for security-sensitive operations
 * (login, logout, permission changes, admin actions).
 */
export function logAudit(
    action: string,
    meta: {
        userId?: string;
        actorId?: string;
        resource?: string;
        result: 'success' | 'failure' | 'denied';
        [key: string]: any;
    }
): void {
    logger.info(
        { ...meta, type: 'audit', action },
        `[AUDIT] ${action} — ${meta.result}`
    );
}

// ─── Request Context Logger ──────────────────────────────────────

/**
 * Create a logger bound to an HTTP request context.
 * Use this inside route handlers to correlate all logs for a single request.
 *
 * @example
 *   app.get('/api/v1/users/:id', async (req, res) => {
 *     const reqLog = createRequestLogger(req);
 *     reqLog.info('Fetching user profile');
 *     // => { "level":"INFO", "requestId":"abc-123", "method":"GET", ... }
 *   });
 */
export function createRequestLogger(
    req: { requestId?: string; method?: string; url?: string; ip?: string }
): pino.Logger {
    return logger.child({
        requestId: req.requestId || 'unknown',
        method: req.method,
        url: req.url,
        ip: req.ip,
    });
}

// ─── Log Levels Reference ────────────────────────────────────────
//
//   TRACE  — ultra-verbose, e.g. function entry/exit
//   DEBUG  — development, e.g. cache hits, DB queries
//   INFO   — normal operations, e.g. server start, request log
//   WARN   — unusual but recoverable, e.g. slow request, rate limit
//   ERROR  — failures that need attention, e.g. DB write failed
//   FATAL  — crash-level, e.g. unhandled exception, can't connect DB
//
// ─────────────────────────────────────────────────────────────────
