import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';

/**
 * GEM Z — Idempotency Middleware
 * 
 * Ensures that financial operations with the same idempotency key
 * return the exact same response without re-execution.
 * 
 * Usage: Client sends `Idempotency-Key: <unique-key>` header.
 * - First request: executes normally, caches response.
 * - Subsequent requests with same key: returns cached response.
 * - Keys expire after 24 hours.
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = req.headers['idempotency-key'] as string;

    // If no idempotency key provided, skip
    if (!key) {
        next();
        return;
    }

    // Validate key format (prevent injection)
    if (key.length > 128 || !/^[a-zA-Z0-9\-_]+$/.test(key)) {
        res.status(400).json({
            success: false,
            message: 'Invalid Idempotency-Key format. Use alphanumeric characters, hyphens, and underscores (max 128 chars).'
        });
        return;
    }

    // Check for cached response
    db.query(
        `SELECT response_code, response_body FROM idempotency_keys 
         WHERE key = $1 AND expires_at > NOW()`,
        [key]
    ).then(cached => {
        if (cached.rowCount && cached.rowCount > 0) {
            const { response_code, response_body } = cached.rows[0];
            // Return the cached response with a header indicating it's a replay
            res.setHeader('Idempotency-Replayed', 'true');
            res.status(response_code).json(response_body);
            return;
        }

        // Attach key to request for post-processing
        (req as any).idempotencyKey = key;

        // Monkey-patch res.json to capture and cache the response
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
            const userId = (req as any).user?.userId;

            // Cache the response asynchronously (fire-and-forget)
            if (userId && res.statusCode < 500) {
                db.query(
                    `INSERT INTO idempotency_keys (key, txn_id, user_id, response_code, response_body)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (key) DO NOTHING`,
                    [key, body?.txnId || body?.data?.txnId || null, userId, res.statusCode, body]
                ).catch((err: any) => {
                    console.error('[Idempotency] Failed to cache response:', err.message);
                });
            }

            return originalJson(body);
        };

        next();
    }).catch(err => {
        console.error('[Idempotency] Lookup error:', err.message);
        // Don't block the request on cache lookup failure
        next();
    });
}
