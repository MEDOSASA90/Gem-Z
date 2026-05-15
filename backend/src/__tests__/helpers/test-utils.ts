/**
 * GEM Z — Test Utilities
 *
 * Helper functions for creating test data, generating tokens,
 * and performing common test operations.
 */

import jwt from 'jsonwebtoken';
import { getTestPool } from './test-db';

// ─── Types ────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    status: string;
    referral_code: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface Wallet {
    id: string;
    owner_type: string;
    owner_id: string;
    currency: string;
    available_bal: number;
    pending_bal: number;
    frozen_bal: number;
    lifetime_earned: number;
    lifetime_spent: number;
    daily_topup_limit: number;
    daily_withdraw_limit: number;
    is_frozen: boolean;
    frozen_reason: string | null;
    frozen_at: Date | null;
    frozen_by: string | null;
    version: number;
    created_at?: Date;
    updated_at?: Date;
}

// ─── Token Generation ─────────────────────────────────────────

/**
 * Generate a test JWT access token.
 * @param userId - User ID to encode
 * @param role - User role to encode
 * @returns Signed JWT token string
 */
export function generateTestToken(userId: string, role: string = 'trainee'): string {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-for-testing';
    return jwt.sign(
        { userId, role },
        secret,
        { expiresIn: '15m' }
    );
}

/**
 * Generate an expired test JWT token.
 * @param userId - User ID to encode
 * @param role - User role to encode
 * @returns Signed expired JWT token string
 */
export function generateExpiredToken(userId: string, role: string = 'trainee'): string {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-for-testing';
    return jwt.sign(
        { userId, role },
        secret,
        { expiresIn: '-1s' }
    );
}

/**
 * Generate a test refresh token.
 * @param userId - User ID to encode
 * @returns Signed refresh token string
 */
export function generateTestRefreshToken(userId: string): string {
    const secret = process.env.REFRESH_SECRET || 'test-refresh-secret-minimum-32-characters-long-for-testing';
    return jwt.sign(
        { userId },
        secret,
        { expiresIn: '7d' }
    );
}

/**
 * Generate an invalid test token (wrong secret).
 * @param userId - User ID to encode
 * @returns Signed JWT with wrong secret
 */
export function generateInvalidToken(userId: string): string {
    return jwt.sign(
        { userId, role: 'trainee' },
        'wrong-secret-key-that-will-not-match',
        { expiresIn: '15m' }
    );
}

// ─── User Creation ────────────────────────────────────────────

/**
 * Create a test user in the database.
 * @param overrides - Partial user data to override defaults
 * @returns Created user record
 */
export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const pool = getTestPool();

    const defaults: User = {
        id: generateUUID(),
        email: `test-${Date.now()}@gemz.app`,
        password_hash: '$2b$12$hashed_password_for_testing',
        full_name: 'Test User',
        role: 'trainee',
        status: 'active',
        referral_code: `REF${Date.now()}`,
    };

    const user = { ...defaults, ...overrides };

    const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, referral_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [user.id, user.email, user.password_hash, user.full_name, user.role, user.status, user.referral_code]
    );

    return result.rows[0] as User;
}

/**
 * Create a test wallet for a user.
 * @param userId - Owner user ID
 * @param overrides - Partial wallet data to override defaults
 * @returns Created wallet record
 */
export async function createTestWallet(userId: string, overrides: Partial<Wallet> = {}): Promise<Wallet> {
    const pool = getTestPool();

    const defaults: Wallet = {
        id: generateUUID(),
        owner_type: 'user',
        owner_id: userId,
        currency: 'EGP',
        available_bal: 10000.00,
        pending_bal: 0,
        frozen_bal: 0,
        lifetime_earned: 10000.00,
        lifetime_spent: 0,
        daily_topup_limit: 50000.00,
        daily_withdraw_limit: 25000.00,
        is_frozen: false,
        frozen_reason: null,
        frozen_at: null,
        frozen_by: null,
        version: 1,
    };

    const wallet = { ...defaults, ...overrides };

    const result = await pool.query(
        `INSERT INTO wallets (
            id, owner_type, owner_id, currency,
            available_bal, pending_bal, frozen_bal,
            lifetime_earned, lifetime_spent,
            daily_topup_limit, daily_withdraw_limit,
            is_frozen, version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
            wallet.id, wallet.owner_type, wallet.owner_id, wallet.currency,
            wallet.available_bal, wallet.pending_bal, wallet.frozen_bal,
            wallet.lifetime_earned, wallet.lifetime_spent,
            wallet.daily_topup_limit, wallet.daily_withdraw_limit,
            wallet.is_frozen, wallet.version,
        ]
    );

    return result.rows[0] as Wallet;
}

// ─── Authentication ───────────────────────────────────────────

/**
 * Simulate a login and return an access token.
 * Creates a user with the correct password hash.
 * @param email - User email
 * @param password - Plaintext password
 * @returns Access token string
 */
export async function loginTestUser(email: string, password: string): Promise<string> {
    const pool = getTestPool();

    // Find user by email
    const result = await pool.query(
        'SELECT id, role FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
        throw new Error(`User with email ${email} not found`);
    }

    const user = result.rows[0];
    return generateTestToken(user.id, user.role);
}

/**
 * Create a user and get their token in one step.
 * @param role - User role
 * @returns Object with user and token
 */
export async function createAuthenticatedUser(role: string = 'trainee'): Promise<{ user: User; token: string }> {
    const user = await createTestUser({ role });
    const token = generateTestToken(user.id, role);
    return { user, token };
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Generate a UUID v4.
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Generate a unique test email address.
 */
export function generateTestEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@gemz.app`;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random number within a range.
 */
export function randomAmount(min: number = 10, max: number = 1000): number {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}
