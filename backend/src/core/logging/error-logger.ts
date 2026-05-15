/**
 * GEM Z — Error Logging Utility
 *
 * Structured error logging with full context capture.
 * All functions include: timestamp, requestId, stack trace, user info.
 *
 * Use these instead of `console.error` or `logger.error()` directly
 * for consistent error formatting and alerting integration.
 */

import { logger } from './logger';

const log = logger.child({ module: 'error' });

// ─── Types ───────────────────────────────────────────────────────

export interface ErrorContext {
    /** Request ID for correlation */
    requestId?: string;
    /** User ID if available */
    userId?: string;
    /** Route/URL where the error occurred */
    route?: string;
    /** HTTP method */
    method?: string;
    /** Additional contextual data (automatically redacted for sensitive fields) */
    [key: string]: any;
}

/** Extended error with additional properties */
export interface AppError extends Error {
    code?: string;
    statusCode?: number;
    isOperational?: boolean;
    details?: Record<string, any>;
}

// ─── Internal: Build Log Payload ─────────────────────────────────

/**
 * Build a structured payload from an error + context.
 * Ensures all errors have consistent metadata regardless of
 * which public function is called.
 */
function buildPayload(
    error: Error,
    context?: ErrorContext
): Record<string, any> {
    const appErr = error as AppError;

    // ─── Extract meaningful info from stack ─────────────────────
    const stackLines = error.stack?.split('\n') || [];
    const location = parseStackLocation(stackLines[1] || '');

    return {
        // ─── Core error info ──────────────────────────────────
        errName: error.name,
        errMsg: error.message,
        errCode: appErr.code,
        statusCode: appErr.statusCode,
        isOperational: appErr.isOperational ?? false,
        errDetails: appErr.details,

        // ─── Stack trace ──────────────────────────────────────
        stack: error.stack,

        // ─── Source location ──────────────────────────────────
        sourceFile: location.file,
        sourceLine: location.line,
        sourceFunction: location.fn,

        // ─── Context ──────────────────────────────────────────
        ...(context || {}),

        // ─── System info ──────────────────────────────────────
        timestamp: new Date().toISOString(),
        type: 'error',
    };
}

/**
 * Parse file path and line number from a stack line.
 */
function parseStackLocation(line: string): {
    file?: string;
    line?: number;
    fn?: string;
} {
    if (!line) return {};

    // Match: "    at functionName (path/to/file.ts:42:10)"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?/);
    if (!match) return {};

    return {
        fn: match[1]?.trim() || undefined,
        file: match[2] || undefined,
        line: match[3] ? parseInt(match[3], 10) : undefined,
    };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Log a standard error. Use for expected, recoverable errors
 * (e.g., validation failure, DB constraint violation).
 *
 * @param error    The Error object
 * @param context  Additional context (requestId, userId, route, etc.)
 *
 * @example
 *   logError(err, { requestId: req.requestId, userId: '42', route: '/api/v1/users' });
 */
export function logError(error: Error, context?: ErrorContext): void {
    const payload = buildPayload(error, context);
    log.error(payload, `[ERROR] ${error.name}: ${error.message}`);
}

/**
 * Log a warning. Use for non-fatal issues that need attention
 * (e.g., deprecated API usage, resource approaching limit).
 *
 * @param message  Human-readable warning message
 * @param context  Additional context
 *
 * @example
 *   logWarning('Rate limit 80% consumed', { userId: '42', remaining: 20 });
 */
export function logWarning(message: string, context?: ErrorContext): void {
    log.warn(
        {
            ...(context || {}),
            timestamp: new Date().toISOString(),
            type: 'warning',
        },
        `[WARN] ${message}`
    );
}

/**
 * Log a critical error. Use for severe, unrecoverable errors
 * that need immediate attention (e.g., data corruption,
 * payment processing failure, security breach).
 *
 * Sends a higher-severity signal to alerting systems.
 *
 * @param error    The Error object
 * @param context  Additional context
 *
 * @example
 *   logCritical(err, { requestId: 'abc-123', route: '/api/v1/pay' });
 */
export function logCritical(error: Error, context?: ErrorContext): void {
    const payload = buildPayload(error, context);

    // Mark as critical for alerting rules
    log.fatal(payload, `[CRITICAL] ${error.name}: ${error.message}`);
}

/**
 * Log an unhandled exception/rejection. Use this in process-level
 * handlers before exiting.
 *
 * @param error    The uncaught error
 * @param origin   'uncaughtException' | 'unhandledRejection' | 'rejectionHandled'
 *
 * @example
 *   process.on('uncaughtException', (err) => {
 *       logUncaught(err, 'uncaughtException');
 *       process.exit(1);
 *   });
 */
export function logUncaught(error: Error, origin: string): void {
    const payload = buildPayload(error, { origin });
    log.fatal(payload, `[UNCAUGHT] ${origin}: ${error.message}`);
}

/**
 * Log a validation error. Use for structured input validation failures
 * that should be tracked but don't need alerting.
 *
 * @param errors   Array of field-level validation errors
 * @param context  Request context
 */
export function logValidationError(
    errors: Array<{ field: string; message: string }>,
    context?: ErrorContext
): void {
    log.warn(
        {
            ...(context || {}),
            validationErrors: errors,
            errorCount: errors.length,
            timestamp: new Date().toISOString(),
            type: 'validation_error',
        },
        `[VALIDATION] ${errors.length} field(s) failed validation`
    );
}

/**
 * Log a security event. Use for suspicious activity,
 * auth failures, permission violations, etc.
 */
export function logSecurity(
    event: string,
    context?: ErrorContext
): void {
    log.warn(
        {
            ...(context || {}),
            timestamp: new Date().toISOString(),
            type: 'security',
        },
        `[SECURITY] ${event}`
    );
}

/**
 * Create a function that wraps an error with context,
 * useful in async flows where context may be lost.
 *
 * @example
 *   const withCtx = contextualizeError({ requestId: 'abc', route: '/users' });
 *   someAsyncOp().catch(withCtx); // logs with full context
 */
export function contextualizeError(
    baseContext: ErrorContext
): (error: Error) => void {
    return (error: Error) => {
        logError(error, baseContext);
    };
}
