/**
 * GEM Z — Request Logging Middleware
 *
 * Logs every HTTP request with structured metadata.
 *   - All requests: method, URL, status, duration, user info
 *   - Slow requests (>1000ms): logged as warnings
 *   - Error responses (4xx, 5xx): logged with details
 *   - Health check endpoint: skipped to reduce noise
 *
 * Usage: app.use(requestLogger);  // mount before routes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

const log = logger.child({ module: 'http' });

// ─── Configuration ───────────────────────────────────────────────

/** Skip logging for these paths */
const SKIP_PATHS = [
    '/health',
    '/healthz',
    '/api/v1/health',
    '/_health',
];

/** Threshold (ms) above which a request is considered "slow" */
const SLOW_REQUEST_THRESHOLD_MS = 1000;

/** Headers we never log */
const SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
];

// ─── Generate Request ID ─────────────────────────────────────────

/**
 * Attach or propagate a request ID for distributed tracing.
 * Checks X-Request-ID header first; generates a new one if missing.
 */
export function requestIdMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Use incoming request ID from upstream (load balancer, gateway)
    // or generate a short unique one
    const existingId =
        (req.headers['x-request-id'] as string) ||
        (req.headers['x-correlation-id'] as string);

    (req as any).requestId = existingId || generateShortId();
    next();
}

function generateShortId(): string {
    const time = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `${time}-${random}`;
}

// ─── Main Request Logger ─────────────────────────────────────────

/**
 * Express middleware that logs every HTTP request.
 * Mount this AFTER security middleware but BEFORE route handlers.
 *
 * @example
 *   app.use(requestIdMiddleware);
 *   app.use(requestLogger);
 *   app.use('/api/v1', routes);
 */
export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Skip health checks
    if (SKIP_PATHS.includes(req.path)) {
        return next();
    }

    const requestId = (req as any).requestId as string | undefined;
    const startMs = Date.now();

    // Collect request metadata
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';
    const contentLength = req.get('content-length');

    // Extract user ID from JWT or session if available
    const userId = extractUserId(req);

    // ─── Sanitized headers ──────────────────────────────────────
    const safeHeaders = sanitizeHeaders(req.headers);

    // ─── Capture response finish ────────────────────────────────

    const finish = () => {
        cleanup();

        const durationMs = Date.now() - startMs;
        const statusCode = res.statusCode;
        const statusCategory = getStatusCategory(statusCode);
        const resContentLength = res.get('content-length');

        const logPayload = {
            requestId,
            method,
            url,
            statusCode,
            statusCategory,
            durationMs,
            ip,
            userAgent,
            userId,
            req: {
                query: req.query,
                // Don't log request body — may contain sensitive data
                contentLength,
                headers: safeHeaders,
            },
            res: {
                contentLength: resContentLength,
            },
            type: 'http',
        };

        // Log slow requests as warnings
        const isSlow = durationMs > SLOW_REQUEST_THRESHOLD_MS;

        // Log errors (4xx, 5xx) with more detail
        const isError = statusCode >= 400;

        if (isError) {
            log.warn(
                {
                    ...logPayload,
                    // In development, log a hint about the error
                    errorHint: (res as any).locals?.error?.message,
                },
                `${method} ${url} → ${statusCode} (${durationMs}ms)`
            );
        } else if (isSlow) {
            log.warn(
                logPayload,
                `SLOW ${method} ${url} → ${statusCode} (${durationMs}ms)`
            );
        } else {
            log.info(
                logPayload,
                `${method} ${url} → ${statusCode} (${durationMs}ms)`
            );
        }
    };

    // ─── Capture errors ─────────────────────────────────────────

    const onError = (error: Error) => {
        cleanup();

        const durationMs = Date.now() - startMs;
        log.error(
            {
                requestId,
                method,
                url,
                ip,
                userId,
                durationMs,
                errMsg: error.message,
                type: 'http_error',
            },
            `${method} ${url} — ERROR (${durationMs}ms)`
        );
    };

    // ─── Cleanup ────────────────────────────────────────────────

    const cleanup = () => {
        res.removeListener('finish', finish);
        res.removeListener('close', finish);
        res.removeListener('error', onError);
    };

    res.once('finish', finish);
    res.once('close', finish);
    res.once('error', onError);

    next();
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Extract the user's real IP, respecting proxies.
 */
function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        // X-Forwarded-For: client, proxy1, proxy2
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Extract userId from JWT payload on the request object.
 * Returns undefined if not authenticated.
 */
function extractUserId(req: Request): string | undefined {
    // Attempt to read from decoded JWT (set by auth middleware)
    const user = (req as any).user;
    if (user?.id || user?.userId || user?.sub) {
        return String(user.id || user.userId || user.sub);
    }

    // Fallback: check if auth middleware set a userId directly
    return (req as any).userId;
}

/**
 * Categorize status codes into buckets.
 */
function getStatusCategory(code: number): string {
    if (code >= 500) return 'server_error';
    if (code >= 400) return 'client_error';
    if (code >= 300) return 'redirect';
    if (code >= 200) return 'success';
    return 'info';
}

/**
 * Remove sensitive headers before logging.
 */
function sanitizeHeaders(
    headers: Request['headers']
): Record<string, string> {
    const safe: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        const lower = key.toLowerCase();
        if (SENSITIVE_HEADERS.includes(lower)) {
            safe[key] = '[Redacted]';
        } else if (typeof value === 'string') {
            safe[key] = value;
        } else if (Array.isArray(value)) {
            safe[key] = `[${value.length} values]`;
        }
    }
    return safe;
}

// ─── Health Check Endpoint ───────────────────────────────────────

/**
 * Lightweight health check handler.
 * Returns 200 OK with Redis + DB status.
 */
export function healthCheckHandler(req: Request, res: Response): void {
    const isRedisReady = (req as any).redisStatus === 'ready';

    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        env: process.env.NODE_ENV || 'development',
        redis: isRedisReady ? 'connected' : 'disconnected',
    });
}
