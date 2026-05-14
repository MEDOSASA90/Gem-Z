"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.emailExists = emailExists;
exports.resolveReferralCode = resolveReferralCode;
exports.updateLastLogin = updateLastLogin;
exports.validateAccountStatus = validateAccountStatus;
exports.sanitizeUser = sanitizeUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../core/database/db");
/**
 * GEM Z — Auth Service
 *
 * Encapsulates all authentication business logic:
 * - Password hashing and verification
 * - User lookup
 * - Last login tracking
 * - Account status validation
 */
const SALT_ROUNDS = 12;
// ─── Password Utilities ─────────────────────────────────────
async function hashPassword(plaintext) {
    const salt = await bcrypt_1.default.genSalt(SALT_ROUNDS);
    return bcrypt_1.default.hash(plaintext, salt);
}
async function verifyPassword(plaintext, hash) {
    return bcrypt_1.default.compare(plaintext, hash);
}
/**
 * Find a user by email. Returns null if not found.
 * Used during login — includes password_hash for verification.
 */
async function findUserByEmail(email) {
    const result = await db_1.db.query(`SELECT id, email, phone, password_hash, role, status, full_name, referral_code, avatar_url, email_verified_at
         FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    return result.rows.length > 0 ? result.rows[0] : null;
}
/**
 * Find a user by ID. Returns null if not found.
 * Used during token refresh — no password_hash needed.
 */
async function findUserById(userId) {
    const result = await db_1.db.query(`SELECT id, email, phone, role, status, full_name, referral_code, avatar_url, email_verified_at
         FROM users WHERE id = $1`, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}
/**
 * Check if an email already exists.
 */
async function emailExists(email, client) {
    const q = client || db_1.db;
    const result = await q.query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [email.toLowerCase().trim()]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Resolve a referral code to the referring user's ID.
 * Returns null if code is invalid.
 */
async function resolveReferralCode(code, client) {
    const q = client || db_1.db;
    const result = await q.query(`SELECT id FROM users WHERE referral_code = $1`, [code]);
    return result.rows.length > 0 ? result.rows[0].id : null;
}
/**
 * Update the user's last_login_at timestamp.
 */
async function updateLastLogin(userId) {
    await db_1.db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
}
// ─── Account Status ──────────────────────────────────────────
/**
 * Validate that a user account is active.
 * Returns an error message if not, or null if OK.
 */
function validateAccountStatus(status) {
    switch (status) {
        case 'active':
        case 'pending_verification':
            return null; // allowed to login
        case 'suspended':
            return 'Your account has been suspended. Contact support.';
        case 'banned':
            return 'Your account has been permanently banned.';
        default:
            return 'Account status unknown. Contact support.';
    }
}
// ─── Safe User Object (strip sensitive fields) ──────────────
function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        full_name: user.full_name,
        referral_code: user.referral_code,
        avatar_url: user.avatar_url || null,
        email_verified_at: user.email_verified_at || null
    };
}
