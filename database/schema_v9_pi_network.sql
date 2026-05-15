-- ============================================
-- Gem Z — Schema v9: Pi Network Integration
-- ============================================

-- Drop if exists for clean migration
DROP TABLE IF EXISTS pi_payments CASCADE;

-- ─── Pi Payments Table ──────────────────────────────────────
-- Tracks all Pi Network payments (U2A and A2U)
CREATE TABLE pi_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User info
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pi_user_uid VARCHAR(255) NOT NULL, -- Pi Network user UID
    
    -- Payment details
    amount NUMERIC(19, 7) NOT NULL CHECK (amount > 0),
    memo VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Direction
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('user_to_app', 'app_to_user')),
    
    -- Product info
    product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('subscription', 'store', 'trainer', 'reward', 'refund')),
    product_id UUID, -- Links to subscriptions, store_orders, etc.
    
    -- Pi Network IDs
    payment_id VARCHAR(255), -- Pi payment identifier from Pi Network
    txid VARCHAR(255), -- Blockchain transaction ID
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'submitted', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX idx_pi_payments_user_id ON pi_payments(user_id);
CREATE INDEX idx_pi_payments_status ON pi_payments(status);
CREATE INDEX idx_pi_payments_direction ON pi_payments(direction);
CREATE INDEX idx_pi_payments_payment_id ON pi_payments(payment_id);
CREATE INDEX idx_pi_payments_created_at ON pi_payments(created_at DESC);

-- ─── Update Trigger ─────────────────────────────────────────
CREATE TRIGGER update_pi_payments_updated_at
    BEFORE UPDATE ON pi_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Add Pi balance to wallets ──────────────────────────────
ALTER TABLE wallets 
    ADD COLUMN IF NOT EXISTS pi_balance NUMERIC(19, 7) NOT NULL DEFAULT 0 CHECK (pi_balance >= 0);

ALTER TABLE wallets 
    ADD COLUMN IF NOT EXISTS pi_address VARCHAR(255); -- Pi wallet address

-- ─── Pi transactions in ledger ──────────────────────────────
-- Add Pi currency to ledger
ALTER TABLE ledger_entries 
    DROP CONSTRAINT IF EXISTS ledger_entries_currency_check;
    
ALTER TABLE ledger_entries 
    ADD CONSTRAINT ledger_entries_currency_check 
    CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED', 'PI'));
