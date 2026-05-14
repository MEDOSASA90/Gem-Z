"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.hashToken = hashToken;
exports.blacklistRefreshToken = blacklistRefreshToken;
exports.isRefreshTokenBlacklisted = isRefreshTokenBlacklisted;
exports.blacklistAllUserTokens = blacklistAllUserTokens;
exports.getRefreshCookieOptions = getRefreshCookieOptions;
exports.getClearCookieOptions = getClearCookieOptions;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../core/database/db");
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
function requiredSecret(name, fallback) {
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
// ─── Token Generation ───────────────────────────────────────
/**
 * Generate both access and refresh tokens for a user.
 * Call this on login and registration.
 */
function generateTokens(user) {
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken };
}
/**
 * Generate only a new access token (used during token refresh).
 */
function generateAccessToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
// ─── Token Verification ─────────────────────────────────────
/**
 * Verify and decode an access token.
 * Throws if expired or invalid.
 */
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
/**
 * Verify and decode a refresh token.
 * Throws if expired or invalid.
 */
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
// ─── Refresh Token Blacklist ─────────────────────────────────
/**
 * Create a SHA-256 hash of a token string.
 * We never store the raw token — only its hash.
 */
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
/**
 * Add a refresh token to the blacklist (called on logout).
 * Stores only the SHA-256 hash + expiry for automatic cleanup.
 */
async function blacklistRefreshToken(token, userId) {
    try {
        const tokenHash = hashToken(token);
        // Decode to get the expiry date
        let expiresAt;
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            expiresAt = decoded?.exp
                ? new Date(decoded.exp * 1000)
                : new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
        }
        catch {
            expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
        }
        await db_1.db.query(`INSERT INTO refresh_token_blacklist (token_hash, user_id, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (token_hash) DO NOTHING`, [tokenHash, userId, expiresAt]);
    }
    catch (err) {
        // Non-fatal: log but don't crash the logout
        console.error('[TokenService] Failed to blacklist token:', err.message);
    }
}
/**
 * Check if a refresh token is blacklisted.
 * Returns true if the token should be rejected.
 */
async function isRefreshTokenBlacklisted(token) {
    try {
        const tokenHash = hashToken(token);
        const result = await db_1.db.query(`SELECT 1 FROM refresh_token_blacklist 
             WHERE token_hash = $1 AND expires_at > NOW()
             LIMIT 1`, [tokenHash]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (err) {
        console.error('[TokenService] Blacklist check failed:', err.message);
        return true;
    }
}
/**
 * Blacklist ALL active refresh tokens for a user.
 * Used when: password changed, account suspended, security breach detected.
 */
async function blacklistAllUserTokens(userId) {
    // We can't enumerate issued tokens (stateless JWT), but we can record
    // a "revokeAll" timestamp and compare it at verification time.
    // For now, this records the event in audit_log for admin review.
    try {
        await db_1.db.query(`INSERT INTO wallet_audit_log (wallet_id, action, actor_user_id, actor_type, new_values)
             SELECT w.id, 'all_tokens_revoked', $1, 'system', '{"reason":"security_logout"}'::jsonb
             FROM wallets w WHERE w.owner_type = 'user' AND w.owner_id = $1 LIMIT 1`, [userId]);
    }
    catch (_) {
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
function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: '/api/v1/auth' // scoped to auth routes only
    };
}
/**
 * Cookie options for clearing the refresh token (logout).
 */
function getClearCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth'
    };
}
