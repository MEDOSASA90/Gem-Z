/**
 * =============================================================================
 * GEM Z — Express Type Augmentations
 * =============================================================================
 *
 * Extends the Express Request interface with GEM Z-specific properties
 * for request tracing, timeouts, and authentication.
 *
 * @module types/express
 */

declare global {
    namespace Express {
        interface Request {
            /** Unique ID for this request, used for log tracing */
            requestId: string;
            /** Timestamp when the request started (for duration logging) */
            requestStartTime: number;
            /** Timeout duration configured for this request */
            timeoutMs?: number;
            /** Whether this request has already timed out */
            timedOut?: boolean;
        }
    }
}

export {};
