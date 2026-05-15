/**
 * =============================================================================
 * GEM Z — Request ID Middleware
 * =============================================================================
 *
 * Generates a unique request ID for every incoming request to enable
 * distributed tracing and log correlation across the application.
 *
 * Features:
 *   - Auto-generates v4 UUID for each request
 *   - Accepts client-provided X-Request-ID (if valid UUID)
 *   - Attaches request ID to response header: X-Request-ID
 *   - Makes request ID available in logs via req.requestId
 *   - Includes request ID in error responses for debugging
 *
 * @module middlewares/request-id
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4, validate as isUuidValid } from 'uuid';

// =============================================================================
// ─── Constants ───────────────────────────────────────────────────────────────
// =============================================================================

/** Header name for the request ID */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Header name indicating a replayed request */
export const REQUEST_ID_REPLAY_HEADER = 'x-request-id-replay';

// =============================================================================
// ─── Type Augmentation ───────────────────────────────────────────────────────
// =============================================================================

/**
 * Extend Express Request to include requestId property.
 */
declare global {
    namespace Express {
        interface Request {
            /** Unique ID for this request, used for log tracing */
            requestId: string;
            /** Timestamp when the request started (for duration logging) */
            requestStartTime: number;
        }
    }
}

// =============================================================================
// ─── Helper Functions ────────────────────────────────────────────────────────
// =============================================================================

/**
 * Validates that a provided request ID is a valid UUID format.
 * Prevents header injection attacks via X-Request-ID.
 */
function isValidRequestId(value: string): boolean {
    if (!value || typeof value !== 'string') {
        return false;
    }
    // Must be a valid UUID v4
    return isUuidValid(value);
}

/**
 * Generates a new v4 UUID for request tracing.
 */
function generateRequestId(): string {
    return uuidv4();
}

// =============================================================================
// ─── Middleware ──────────────────────────────────────────────────────────────
// =============================================================================

/**
 * Request ID middleware.
 *
 * Attaches a unique request ID to every request:
 * 1. Checks for client-provided X-Request-ID header
 * 2. Validates it (must be a valid UUID)
 * 3. If invalid or missing, generates a new v4 UUID
 * 4. Attaches the ID to req.requestId
 * 5. Sets X-Request-ID response header
 * 6. Records request start time for duration tracking
 *
 * @param options.allowClientGenerated - Whether to accept client-provided IDs (default: true)
 * @param options.headerName - Custom header name (default: 'x-request-id')
 */
interface RequestIdOptions {
    /** Whether to accept client-provided request IDs */
    allowClientGenerated?: boolean;
    /** Custom header name for the request ID */
    headerName?: string;
}

export function requestIdMiddleware(options: RequestIdOptions = {}): RequestHandler {
    const {
        allowClientGenerated = true,
        headerName = REQUEST_ID_HEADER,
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        let requestId: string;

        // ─── Check for client-provided request ID ──────────
        const clientRequestId = req.headers[headerName] as string | undefined;

        if (allowClientGenerated && clientRequestId && isValidRequestId(clientRequestId)) {
            // Use the client's request ID if it's a valid UUID
            requestId = clientRequestId;
            (req as any).requestIdReplay = true;
        } else {
            // Generate a new request ID
            requestId = generateRequestId();
            (req as any).requestIdReplay = false;
        }

        // ─── Attach to request object ──────────────────────
        req.requestId = requestId;
        req.requestStartTime = Date.now();

        // ─── Attach to response headers ────────────────────
        res.setHeader(headerName, requestId);

        // Mark as replay if client-provided
        if ((req as any).requestIdReplay) {
            res.setHeader(REQUEST_ID_REPLAY_HEADER, 'true');
        }

        // ─── Log the incoming request ──────────────────────
        const method = req.method;
        const path = req.path;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        console.log(`[${requestId}] → ${method} ${path} | IP: ${ip}`);

        next();
    };
}

/**
 * Enhanced request logging middleware.
 * Logs request completion with duration and status code.
 * Uses the requestId set by requestIdMiddleware.
 */
export function requestLoggerMiddleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const requestId = req.requestId || 'no-request-id';

        // Capture the original end function
        const originalEnd = res.end.bind(res);
        const chunks: Buffer[] = [];

        // Intercept response data for error logging
        const originalWrite = res.write.bind(res);
        res.write = function (chunk: any, ...args: any[]): boolean {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return originalWrite(chunk, ...args);
        };

        // Override end to log request completion
        res.end = function (chunk?: any, ...args: any[]): Response {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }

            const duration = Date.now() - (req.requestStartTime || Date.now());
            const statusCode = res.statusCode;
            const method = req.method;
            const path = req.originalUrl || req.url;

            // Log based on status code
            const logLine = `[${requestId}] ← ${method} ${path} | Status: ${statusCode} | Duration: ${duration}ms`;

            if (statusCode >= 500) {
                console.error(`[ERROR] ${logLine}`);
            } else if (statusCode >= 400) {
                console.warn(`[WARN]  ${logLine}`);
            } else {
                console.log(`[OK]    ${logLine}`);
            }

            // Restore original end
            return originalEnd(chunk, ...args);
        };

        next();
    };
}

/**
 * Combined request ID + logging middleware stack.
 *
 * Usage:
 *   app.use(requestId());
 */
export function requestId(): RequestHandler[] {
    return [
        requestIdMiddleware(),
        requestLoggerMiddleware(),
    ];
}

export default requestId;
