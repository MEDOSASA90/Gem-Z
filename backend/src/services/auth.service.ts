import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import { db } from '../core/database/db';

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

export async function hashPassword(plaintext: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(plaintext, salt);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
}

// ─── User Lookup ─────────────────────────────────────────────

export interface UserRecord {
    id: string;
    email: string;
    password_hash: string;
    role: string;
    status: string;
    full_name: string;
    phone?: string | null;
    referral_code: string;
    avatar_url: string | null;
    email_verified_at: string | null;
}

/**
 * Find a user by email. Returns null if not found.
 * Used during login — includes password_hash for verification.
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await db.query(
        `SELECT id, email, phone, password_hash, role, status, full_name, referral_code, avatar_url, email_verified_at
         FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Find a user by ID. Returns null if not found.
 * Used during token refresh — no password_hash needed.
 */
export async function findUserById(userId: string): Promise<Omit<UserRecord, 'password_hash'> | null> {
    const result = await db.query(
        `SELECT id, email, phone, role, status, full_name, referral_code, avatar_url, email_verified_at
         FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check if an email already exists.
 */
export async function emailExists(email: string, client?: PoolClient): Promise<boolean> {
    const q = client || db;
    const result = await q.query(
        `SELECT 1 FROM users WHERE email = $1 LIMIT 1`,
        [email.toLowerCase().trim()]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Resolve a referral code to the referring user's ID.
 * Returns null if code is invalid.
 */
export async function resolveReferralCode(code: string, client?: PoolClient): Promise<string | null> {
    const q = client || db;
    const result = await q.query(
        `SELECT id FROM users WHERE referral_code = $1`,
        [code]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Update the user's last_login_at timestamp.
 */
export async function updateLastLogin(userId: string): Promise<void> {
    await db.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [userId]
    );
}

// ─── Account Status ──────────────────────────────────────────

/**
 * Validate that a user account is active.
 * Returns an error message if not, or null if OK.
 */
export function validateAccountStatus(status: string): string | null {
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

export function sanitizeUser(user: any) {
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
