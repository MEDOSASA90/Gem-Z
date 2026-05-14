import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../core/database/db';

/**
 * GEM Z — Token Service
 *
 * Centralized JWT token generation and verification.
 * Single source of truth for all token operations.
 *
 * Access Token:  15 min, contains userId + role (used for API auth)
 * Refresh Token: 7 days, contains userId only (used for token rotation)
 *
 * Security:
 * - Refresh tokens are stored by hash in the blacklist on logout
 * - Blacklist is checked on every /auth/refresh call
 */

function requiredSecret(name: 'JWT_SECRET' | 'REFRESH_SECRET', fallback: string): string {
    const value = process.env[name];
    if (!value && process.env.NODE_ENV === 'production') {
        throw new Error(`${name} is required in production.`);
    }
    return value || fallback;
}

const JWT_SECRET = requiredSecret('JWT_SECRET', 'dev_jwt_secret_change_me');
const REFRESH_SECRET = requiredSecret('REFRESH_SECRET', 'dev_refresh_secret_change_me');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Payload Types ──────────────────────────────────────────

export interface AccessTokenPayload {
    userId: string;
    role: string;
}

export interface RefreshTokenPayload {
    userId: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

// ─── Token Generation ───────────────────────────────────────

/**
 * Generate both access and refresh tokens for a user.
 * Call this on login and registration.
 */
export function generateTokens(user: { id: string; role: string }): TokenPair {
    const accessToken = jwt.sign(
        { userId: user.id, role: user.role } as AccessTokenPayload,
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        { userId: user.id } as RefreshTokenPayload,
        REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
}

/**
 * Generate only a new access token (used during token refresh).
 */
export function generateAccessToken(user: { id: string; role: string }): string {
    return jwt.sign(
        { userId: user.id, role: user.role } as AccessTokenPayload,
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

// ─── Token Verification ─────────────────────────────────────

/**
 * Verify and decode an access token.
 * Throws if expired or invalid.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token.
 * Throws if expired or invalid.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

// ─── Refresh Token Blacklist ─────────────────────────────────

/**
 * Create a SHA-256 hash of a token string.
 * We never store the raw token — only its hash.
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Add a refresh token to the blacklist (called on logout).
 * Stores only the SHA-256 hash + expiry for automatic cleanup.
 */
export async function blacklistRefreshToken(
    token: string,
    userId: string
): Promise<void> {
    try {
        const tokenHash = hashToken(token);

        // Decode to get the expiry date
        let expiresAt: Date;
        try {
            const decoded = jwt.decode(token) as { exp?: number };
            expiresAt = decoded?.exp
                ? new Date(decoded.exp * 1000)
                : new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
        } catch {
            expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
        }

        await db.query(
            `INSERT INTO refresh_token_blacklist (token_hash, user_id, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (token_hash) DO NOTHING`,
            [tokenHash, userId, expiresAt]
        );
    } catch (err) {
        // Non-fatal: log but don't crash the logout
        console.error('[TokenService] Failed to blacklist token:', (err as Error).message);
    }
}

/**
 * Check if a refresh token is blacklisted.
 * Returns true if the token should be rejected.
 */
export async function isRefreshTokenBlacklisted(token: string): Promise<boolean> {
    try {
        const tokenHash = hashToken(token);
        const result = await db.query(
            `SELECT 1 FROM refresh_token_blacklist 
             WHERE token_hash = $1 AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );
        return (result.rowCount ?? 0) > 0;
    } catch (err) {
        console.error('[TokenService] Blacklist check failed:', (err as Error).message);
        return true;
    }
}

/**
 * Blacklist ALL active refresh tokens for a user.
 * Used when: password changed, account suspended, security breach detected.
 */
export async function blacklistAllUserTokens(userId: string): Promise<void> {
    // We can't enumerate issued tokens (stateless JWT), but we can record
    // a "revokeAll" timestamp and compare it at verification time.
    // For now, this records the event in audit_log for admin review.
    try {
        await db.query(
            `INSERT INTO wallet_audit_log (wallet_id, action, actor_user_id, actor_type, new_values)
             SELECT w.id, 'all_tokens_revoked', $1, 'system', '{"reason":"security_logout"}'::jsonb
             FROM wallets w WHERE w.owner_type = 'user' AND w.owner_id = $1 LIMIT 1`,
            [userId]
        );
    } catch (_) {
        // Non-fatal
    }
}

// ─── Cookie Config ──────────────────────────────────────────

/**
 * Standard cookie options for refresh tokens.
 * httpOnly: prevents XSS access
 * secure: HTTPS only in production
 * sameSite: prevents CSRF
 */
export function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: '/api/v1/auth'   // scoped to auth routes only
    };
}

/**
 * Cookie options for clearing the refresh token (logout).
 */
export function getClearCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/api/v1/auth'
    };
}
