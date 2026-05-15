/**
 * =============================================================================
 * GEM Z — Request Timeout Middleware
 * =============================================================================
 *
 * Configurable request timeout that aborts requests that take too long,
 * returning HTTP 408 (Request Timeout) to the client.
 *
 * Features:
 *   - Default timeout: 30 seconds
 *   - Configurable per-route
 *   - Returns 408 Request Timeout with structured error
 *   - Logs slow requests for monitoring
 *   - Cleans up resources on timeout
 *   - Prevents hanging connections
 *
 * @module middlewares/timeout
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// =============================================================================
// ─── Constants ───────────────────────────────────────────────────────────────
// =============================================================================

/** Default timeout in milliseconds (30 seconds) */
export const DEFAULT_TIMEOUT_MS = 30000;

/** Timeout for file upload routes (2 minutes) */
export const UPLOAD_TIMEOUT_MS = 120000;

/** Timeout for report generation routes (60 seconds) */
export const REPORT_TIMEOUT_MS = 60000;

/** Threshold for "slow request" warning logs (10 seconds) */
const SLOW_REQUEST_THRESHOLD_MS = 10000;

// =============================================================================
// ─── Type Augmentation ───────────────────────────────────────────────────────
// =============================================================================

declare global {
    namespace Express {
        interface Request {
            /** Timeout duration configured for this request */
            timeoutMs?: number;
            /** Whether this request has already timed out */
            timedOut?: boolean;
        }
    }
}

// =============================================================================
// ─── Helper Functions ────────────────────────────────────────────────────────
// =============================================================================

/**
 * Logs a timeout event for monitoring and alerting.
 */
function logTimeout(req: Request, timeoutMs: number): void {
    const requestId = req.requestId || 'no-request-id';
    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    console.error(`[TIMEOUT] [${requestId}] ${method} ${path} exceeded ${timeoutMs}ms | IP: ${ip}`);
}

/**
 * Logs a slow request warning (completed but took a long time).
 */
function logSlowRequest(req: Request, duration: number, statusCode: number): void {
    const requestId = req.requestId || 'no-request-id';
    const method = req.method;
    const path = req.originalUrl || req.url;

    console.warn(
        `[SLOW] [${requestId}] ${method} ${path} completed in ${duration}ms ` +
        `(threshold: ${SLOW_REQUEST_THRESHOLD_MS}ms) | Status: ${statusCode}`
    );
}

// =============================================================================
// ─── Middleware Factory ──────────────────────────────────────────────────────
// =============================================================================

/**
 * Creates a timeout middleware with the specified duration.
 *
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30s)
 * @returns Express middleware that enforces the timeout
 *
 * @example
 *   // Default 30s timeout
 *   app.use(timeoutMiddleware());
 *
 *   // Custom timeout for a specific route
 *   router.post('/generate-report', timeoutMiddleware(60000), generateReport);
 *
 *   // Long timeout for file uploads
 *   router.post('/upload', timeoutMiddleware(120000), uploadHandler);
 */
export function timeoutMiddleware(timeoutMs: number = DEFAULT_TIMEOUT_MS): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Store timeout config on request for reference
        req.timeoutMs = timeoutMs;
        req.timedOut = false;

        const requestId = req.requestId || 'no-request-id';
        const startTime = Date.now();

        // Set up the timeout timer
        const timeoutTimer = setTimeout(() => {
            // Mark the request as timed out
            req.timedOut = true;

            // Log the timeout event
            logTimeout(req, timeoutMs);

            // Only send response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    message: `Request timeout after ${timeoutMs}ms. The server took too long to process your request.`,
                    meta: {
                        requestId,
                        timeoutMs,
                        path: req.originalUrl || req.url,
                        method: req.method,
                    },
                });
            }

            // Close the underlying socket to free resources
            try {
                req.socket.destroy();
            } catch {
                // Socket may already be closed
            }
        }, timeoutMs);

        // Clean up the timeout when the response is finished
        res.on('finish', () => {
            clearTimeout(timeoutTimer);

            const duration = Date.now() - startTime;

            // Log slow requests (completed successfully but took a long time)
            if (duration > SLOW_REQUEST_THRESHOLD_MS && !req.timedOut) {
                logSlowRequest(req, duration, res.statusCode);
            }
        });

        // Clean up on response close (client disconnected)
        res.on('close', () => {
            clearTimeout(timeoutTimer);
        });

        // Clean up on error
        res.on('error', () => {
            clearTimeout(timeoutTimer);
        });

        next();
    };
}

// =============================================================================
// ─── Named Timeout Presets ───────────────────────────────────────────────────
// =============================================================================

/**
 * Timeout preset for standard API routes (30 seconds).
 * Use for: CRUD operations, authentication, general API calls.
 */
export function apiTimeout(): RequestHandler {
    return timeoutMiddleware(DEFAULT_TIMEOUT_MS);
}

/**
 * Timeout preset for file upload routes (2 minutes).
 * Use for: image uploads, document uploads, multipart form data.
 */
export function uploadTimeout(): RequestHandler {
    return timeoutMiddleware(UPLOAD_TIMEOUT_MS);
}

/**
 * Timeout preset for report generation (60 seconds).
 * Use for: data export, analytics, AI generation, complex queries.
 */
export function reportTimeout(): RequestHandler {
    return timeoutMiddleware(REPORT_TIMEOUT_MS);
}

/**
 * Timeout preset for quick operations (5 seconds).
 * Use for: health checks, simple lookups, ping/pong.
 */
export function quickTimeout(): RequestHandler {
    return timeoutMiddleware(5000);
}

/**
 * Timeout preset for financial operations (15 seconds).
 * Use for: payments, transfers, wallet operations.
 * Shorter timeout to prevent hanging financial transactions.
 */
export function financialTimeout(): RequestHandler {
    return timeoutMiddleware(15000);
}

// =============================================================================
// ─── Combined Export ─────────────────────────────────────────────────────────
// =============================================================================

/**
 * Combined timeout middleware stack with default API timeout.
 *
 * Usage:
 *   app.use(timeout());
 */
export function timeout(): RequestHandler {
    return timeoutMiddleware(DEFAULT_TIMEOUT_MS);
}

export default timeoutMiddleware;
