-- ============================================================
--  GEM Z — Schema v6: Unified Ledger-Based Wallet System
--  Consolidates v1 ledger + v5 financial tables into one system
-- ============================================================

-- ============================================================
-- STEP 1: Enhance existing wallets table
-- ============================================================

-- Add frozen balance column
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS frozen_bal NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (frozen_bal >= 0);

-- Add lifetime spent tracking
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS lifetime_spent NUMERIC(19,4) NOT NULL DEFAULT 0;

-- Add daily limits
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS daily_topup_limit NUMERIC(19,4) NOT NULL DEFAULT 50000.0000;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS daily_withdraw_limit NUMERIC(19,4) NOT NULL DEFAULT 25000.0000;

-- Add freeze state
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS frozen_reason TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS frozen_by UUID;

-- Add optimistic concurrency version
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Index on frozen wallets for admin queries
CREATE INDEX IF NOT EXISTS idx_wallets_frozen ON wallets(is_frozen) WHERE is_frozen = TRUE;

-- ============================================================
-- STEP 2: Enhance existing transactions table
-- ============================================================

-- Add idempotency key column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) UNIQUE;

-- Add parent transaction reference (for refunds/reversals)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_txn_id UUID REFERENCES transactions(id);

-- Add gateway response storage
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- Add failure tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add IP and device tracking for fraud detection
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add new transaction types to the enum (safe upsert approach)
DO $$
BEGIN
    -- Check and add each new enum value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'p2p_transfer' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'p2p_transfer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'challenge_entry_fee' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'challenge_entry_fee';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'challenge_prize_payout' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'challenge_prize_payout';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'freeze' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'freeze';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unfreeze' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'unfreeze';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coins_redemption' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'coins_redemption';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'platform_credit' AND enumtypid = 'txn_type'::regtype) THEN
        ALTER TYPE txn_type ADD VALUE 'platform_credit';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_txn_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_gateway_ref ON transactions(gateway_ref) WHERE gateway_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_parent ON transactions(parent_txn_id) WHERE parent_txn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_initiator ON transactions(initiator_user_id);

-- ============================================================
-- STEP 3: Enhance ledger_entries table
-- ============================================================

-- Add balance field tracking (which balance was affected)
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS balance_field VARCHAR(20) NOT NULL DEFAULT 'available';

-- ============================================================
-- STEP 4: New table — idempotency_keys
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key             VARCHAR(128)    PRIMARY KEY,
    txn_id          UUID            REFERENCES transactions(id),
    user_id         UUID            NOT NULL REFERENCES users(id),
    response_code   INTEGER         NOT NULL,
    response_body   JSONB           NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================
-- STEP 5: Enhance withdrawal_requests table
-- ============================================================

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS txn_id UUID REFERENCES transactions(id);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS fee NUMERIC(19,4) NOT NULL DEFAULT 0;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS net_amount NUMERIC(19,4);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS risk_score NUMERIC(4,2);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);

-- ============================================================
-- STEP 6: New table — transaction_reversals
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_reversals (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_txn_id     UUID        NOT NULL REFERENCES transactions(id),
    reversal_txn_id     UUID        NOT NULL REFERENCES transactions(id),
    reason              TEXT        NOT NULL,
    reversal_type       VARCHAR(30) NOT NULL,  -- 'full_refund', 'partial_refund', 'chargeback', 'admin_correction'
    amount              NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    initiated_by        UUID        NOT NULL REFERENCES users(id),
    approved_by         UUID        REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reversals_original ON transaction_reversals(original_txn_id);

-- ============================================================
-- STEP 7: New table — wallet_audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    wallet_id       UUID            NOT NULL REFERENCES wallets(id),
    action          VARCHAR(50)     NOT NULL,
    actor_user_id   UUID            REFERENCES users(id),
    actor_type      VARCHAR(20)     NOT NULL,  -- 'user', 'admin', 'system', 'webhook'
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_wallet ON wallet_audit_log(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON wallet_audit_log(actor_user_id);

-- ============================================================
-- STEP 8: New table — daily_wallet_snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_wallet_snapshots (
    id                  BIGSERIAL       PRIMARY KEY,
    wallet_id           UUID            NOT NULL REFERENCES wallets(id),
    snapshot_date       DATE            NOT NULL,
    available_bal       NUMERIC(19,4)   NOT NULL,
    pending_bal         NUMERIC(19,4)   NOT NULL,
    frozen_bal          NUMERIC(19,4)   NOT NULL,
    ledger_computed_bal NUMERIC(19,4)   NOT NULL,
    is_reconciled       BOOLEAN         NOT NULL DEFAULT FALSE,
    discrepancy         NUMERIC(19,4),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (wallet_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_unreconciled ON daily_wallet_snapshots(is_reconciled) WHERE is_reconciled = FALSE;

-- ============================================================
-- STEP 9: New table — transaction_approval_queue
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_approval_queue (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    txn_id          UUID        NOT NULL REFERENCES transactions(id),
    wallet_id       UUID        NOT NULL REFERENCES wallets(id),
    amount          NUMERIC(19,4) NOT NULL,
    reason          TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by     UUID        REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 10: Immutability triggers on ledger_entries
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'LEDGER VIOLATION: ledger_entries is append-only. UPDATE and DELETE operations are forbidden.';
END;
$$;

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS trg_ledger_no_update ON ledger_entries;
DROP TRIGGER IF EXISTS trg_ledger_no_delete ON ledger_entries;

CREATE TRIGGER trg_ledger_no_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_ledger_no_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- ============================================================
-- STEP 11: Wallet version bump trigger
-- ============================================================

CREATE OR REPLACE FUNCTION trg_wallet_version_bump()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_version ON wallets;
CREATE TRIGGER trg_wallets_version
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION trg_wallet_version_bump();

-- ============================================================
-- STEP 12: Cleanup expired idempotency keys (run via cron)
-- ============================================================

-- Helper function to be called by pg_cron or application scheduler
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM idempotency_keys WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================
-- STEP 13: Ensure platform wallet exists (singleton)
-- ============================================================

INSERT INTO wallets (owner_type, owner_id, currency)
SELECT 'platform', uuid_generate_v4(), 'EGP'
WHERE NOT EXISTS (
    SELECT 1 FROM wallets WHERE owner_type = 'platform' AND currency = 'EGP'
);

-- ============================================================
-- END OF SCHEMA v6 — Unified Wallet System
-- ============================================================
