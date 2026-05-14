import rateLimit from 'express-rate-limit';

/**
 * GEM Z — Rate Limiters
 *
 * Protects against DDoS, brute-force, and abuse.
 * Each limiter is scoped to the authenticated user ID or IP address.
 */

// ─── General API Limiter ─────────────────────────────────────

/**
 * Default limit for all API routes.
 * 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Auth Limiters ───────────────────────────────────────────

/**
 * Login brute-force protection.
 * 5 attempts per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts. Please wait 15 minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,  // don't count successful logins
});

/**
 * Registration rate limit.
 * 3 registrations per hour per IP.
 */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        message: 'Too many registration attempts from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Password reset / forgot password.
 * 3 requests per 15 minutes per IP.
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset requests. Please wait 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Wallet / Financial Limiters ─────────────────────────────

/**
 * Standard rate limit for wallet read operations.
 * 60 requests per minute per user.
 */
export const walletReadLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 60,
    message: {
        success: false,
        message: 'Too many requests. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
        return req.user?.userId || req.ip;
    }
});

/**
 * Strict rate limit for wallet write operations (payments, transfers).
 * 10 requests per minute per user.
 */
export const walletWriteLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 10,
    message: {
        success: false,
        message: 'Too many financial operations. Please wait before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
        return `write:${req.user?.userId || req.ip}`;
    }
});

/**
 * Very strict rate limit for withdrawal requests.
 * 5 requests per minute per user.
 */
export const withdrawalLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 5,
    message: {
        success: false,
        message: 'Too many withdrawal requests. Please wait before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
        return `withdraw:${req.user?.userId || req.ip}`;
    }
});

/**
 * Webhook rate limit — higher throughput for gateway callbacks.
 * 100 requests per minute per IP (gateways may batch callbacks).
 */
export const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, message: 'Rate limit exceeded for webhooks.' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * File upload rate limit.
 * 20 uploads per hour per user.
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 20,
    message: {
        success: false,
        message: 'Too many file uploads. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
        return `upload:${req.user?.userId || req.ip}`;
    }
});
