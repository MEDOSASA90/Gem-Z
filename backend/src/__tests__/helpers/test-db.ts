/**
 * GEM Z — Test Database Helper
 *
 * Provides utilities for managing the test database:
 * - setupTestDB: Create test tables
 * - teardownTestDB: Drop test tables
 * - seedTestData: Insert test data
 * - clearTestData: Clear data between tests
 */

import { Pool, PoolClient } from 'pg';

// Test database connection pool
const testPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5433/gemz_test_db',
    max: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 2000,
});

// ─── SQL for Creating Test Tables ─────────────────────────────

const CREATE_TABLES_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'trainee',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    phone VARCHAR(20),
    country_code VARCHAR(10) DEFAULT '+20',
    gender VARCHAR(20),
    date_of_birth DATE,
    referred_by_user_id UUID,
    referral_code VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    fitness_level VARCHAR(50),
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    id_parsed_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(50) NOT NULL,
    owner_id UUID NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    available_bal DECIMAL(15,4) NOT NULL DEFAULT 0,
    pending_bal DECIMAL(15,4) NOT NULL DEFAULT 0,
    frozen_bal DECIMAL(15,4) NOT NULL DEFAULT 0,
    lifetime_earned DECIMAL(15,4) NOT NULL DEFAULT 0,
    lifetime_spent DECIMAL(15,4) NOT NULL DEFAULT 0,
    daily_topup_limit DECIMAL(15,4) NOT NULL DEFAULT 50000,
    daily_withdraw_limit DECIMAL(15,4) NOT NULL DEFAULT 25000,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_reason TEXT,
    frozen_at TIMESTAMP,
    frozen_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_type, owner_id, currency)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    idempotency_key VARCHAR(255),
    txn_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(15,4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    description TEXT,
    initiator_user_id UUID,
    payment_gateway VARCHAR(50),
    gateway_ref VARCHAR(255),
    gateway_response JSONB,
    parent_txn_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT
);

-- Ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id SERIAL PRIMARY KEY,
    txn_id UUID NOT NULL REFERENCES transactions(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount DECIMAL(15,4) NOT NULL,
    running_balance DECIMAL(15,4) NOT NULL,
    balance_field VARCHAR(20) NOT NULL DEFAULT 'available',
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet audit log table
CREATE TABLE IF NOT EXISTS wallet_audit_log (
    id SERIAL PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    action VARCHAR(50) NOT NULL,
    actor_user_id UUID,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    txn_id UUID,
    amount DECIMAL(15,4) NOT NULL,
    fee DECIMAL(15,4) NOT NULL DEFAULT 0,
    net_amount DECIMAL(15,4) NOT NULL,
    method VARCHAR(50) NOT NULL,
    account_number VARCHAR(255),
    account_name VARCHAR(255),
    bank_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    admin_note TEXT,
    rejection_reason TEXT,
    risk_score DECIMAL(5,2),
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    requested_by UUID NOT NULL,
    processed_by UUID,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    used_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    used_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Refresh token blacklist table
CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trainee profiles table
CREATE TABLE IF NOT EXISTS trainee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    fitness_level VARCHAR(50),
    id_front_url TEXT,
    id_back_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trainer profiles table
CREATE TABLE IF NOT EXISTS trainer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    bio TEXT,
    specializations TEXT[],
    certifications TEXT[],
    years_experience INTEGER DEFAULT 0,
    hourly_rate_egp DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Idempotency records table
CREATE TABLE IF NOT EXISTS idempotency_records (
    key VARCHAR(255) PRIMARY KEY,
    txn_id UUID,
    user_id UUID NOT NULL,
    response_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);
`;

// ─── SQL for Dropping Test Tables ─────────────────────────────

const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS idempotency_records CASCADE;
DROP TABLE IF EXISTS trainer_profiles CASCADE;
DROP TABLE IF EXISTS trainee_profiles CASCADE;
DROP TABLE IF EXISTS refresh_token_blacklist CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS wallet_audit_log CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
`;

// ─── Test Data Insertion SQL ──────────────────────────────────

const SEED_DATA_SQL = `
-- Insert test users
INSERT INTO users (id, email, password_hash, full_name, role, status, referral_code)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'trainee@test.com', '$2b$12$hashed', 'Test Trainee', 'trainee', 'active', 'REF001'),
    ('22222222-2222-2222-2222-222222222222', 'trainer@test.com', '$2b$12$hashed', 'Test Trainer', 'trainer', 'active', 'REF002'),
    ('33333333-3333-3333-3333-333333333333', 'admin@test.com', '$2b$12$hashed', 'Test Admin', 'super_admin', 'active', 'REF003'),
    ('44444444-4444-4444-4444-444444444444', 'suspended@test.com', '$2b$12$hashed', 'Suspended User', 'trainee', 'suspended', 'REF004'),
    ('55555555-5555-5555-5555-555555555555', 'banned@test.com', '$2b$12$hashed', 'Banned User', 'trainee', 'banned', 'REF005')
ON CONFLICT (id) DO NOTHING;

-- Insert test wallets
INSERT INTO wallets (id, owner_type, owner_id, currency, available_bal, is_frozen)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', '11111111-1111-1111-1111-111111111111', 'EGP', 10000.0000, FALSE),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user', '22222222-2222-2222-2222-222222222222', 'EGP', 5000.0000, FALSE),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user', '33333333-3333-3333-3333-333333333333', 'EGP', 50000.0000, FALSE),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'user', '44444444-4444-4444-4444-444444444444', 'EGP', 2000.0000, TRUE),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'platform', '00000000-0000-0000-0000-000000000000', 'EGP', 100000.0000, FALSE)
ON CONFLICT DO NOTHING;

-- Insert test transactions
INSERT INTO transactions (id, reference_no, txn_type, status, total_amount, currency, description, initiator_user_id)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'TXN-TEST-001', 'wallet_topup', 'completed', 5000.0000, 'EGP', 'Test topup', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'TXN-TEST-002', 'wallet_topup', 'completed', 3000.0000, 'EGP', 'Test topup 2', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'TXN-TEST-003', 'order_payment', 'completed', 1500.0000, 'EGP', 'Test payment', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;
`;

// ─── Public API ───────────────────────────────────────────────

/**
 * Create all test tables in the test database.
 */
export async function setupTestDB(): Promise<void> {
    const client = await testPool.connect();
    try {
        await client.query(CREATE_TABLES_SQL);
        console.log('✅ Test tables created');
    } catch (error) {
        console.error('❌ Failed to create test tables:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Drop all test tables from the test database.
 */
export async function teardownTestDB(): Promise<void> {
    const client = await testPool.connect();
    try {
        await client.query(DROP_TABLES_SQL);
        console.log('✅ Test tables dropped');
    } catch (error) {
        console.error('❌ Failed to drop test tables:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Seed test database with sample data.
 */
export async function seedTestData(): Promise<void> {
    const client = await testPool.connect();
    try {
        await client.query(SEED_DATA_SQL);
        console.log('✅ Test data seeded');
    } catch (error) {
        console.error('❌ Failed to seed test data:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Clear all data from test tables (between tests).
 */
export async function clearTestData(): Promise<void> {
    const client = await testPool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE idempotency_records CASCADE');
        await client.query('TRUNCATE TABLE ledger_entries CASCADE');
        await client.query('TRUNCATE TABLE wallet_audit_log CASCADE');
        await client.query('TRUNCATE TABLE withdrawal_requests CASCADE');
        await client.query('TRUNCATE TABLE transactions CASCADE');
        await client.query('TRUNCATE TABLE wallets CASCADE');
        await client.query('TRUNCATE TABLE trainee_profiles CASCADE');
        await client.query('TRUNCATE TABLE trainer_profiles CASCADE');
        await client.query('TRUNCATE TABLE email_verification_tokens CASCADE');
        await client.query('TRUNCATE TABLE password_reset_tokens CASCADE');
        await client.query('TRUNCATE TABLE refresh_token_blacklist CASCADE');
        await client.query('TRUNCATE TABLE users CASCADE');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Failed to clear test data:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get a database client from the test pool.
 */
export async function getTestClient(): Promise<PoolClient> {
    return testPool.connect();
}

/**
 * Execute a query on the test pool.
 */
export async function testQuery(text: string, params?: any[]): Promise<any> {
    return testPool.query(text, params);
}

/**
 * Get the test database pool (for integration tests).
 */
export function getTestPool(): Pool {
    return testPool;
}

/**
 * End the test pool (cleanup after all tests).
 */
export async function endTestPool(): Promise<void> {
    await testPool.end();
}
