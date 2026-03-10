-- ============================================================
--  GEM Z FITNESS ECOSYSTEM — Pricing & Commission Seeding
--  Target: PostgreSQL
-- ============================================================

-- 1. B2C Subscriptions (GEM Z PRO)
-- Since a global subscription table wasn't explicitly in the initial schema,
-- we create it here to hold the platform-wide "GEM Z PRO" plan.
CREATE TABLE IF NOT EXISTS platform_subscription_plans (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)    NOT NULL,
    duration_days   INTEGER         NOT NULL,
    price_egp       NUMERIC(12,2)   NOT NULL,
    features        TEXT[],
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Insert the "GEM Z PRO" plan
INSERT INTO platform_subscription_plans (name, duration_days, price_egp, features)
VALUES (
    'GEM Z PRO', 
    30, 
    150.00, 
    ARRAY['Unlocks AI Nutritionist', 'Unlimited Diet Plans', 'AI Form Correction']
);


-- 2. Platform Commission Rates (B2B & Affiliates)

-- Gyms: Set the default platform_fee_pct for new Gym entities to 12.00 (12%)
ALTER TABLE gyms ALTER COLUMN platform_fee_pct SET DEFAULT 12.00;

-- Update any existing gyms if needed (optional, keeping it default forward-facing, but let's sync)
UPDATE gyms SET platform_fee_pct = 12.00;

-- Gyms (Off-Peak): Set a rule that transactions flagged as "off-peak" incur a 20.00 (20%) platform fee.
-- We add the platform_fee_pct override to the gym_pricing_rules table.
ALTER TABLE gym_pricing_rules ADD COLUMN IF NOT EXISTS platform_fee_pct NUMERIC(4,2) DEFAULT 20.00;
UPDATE gym_pricing_rules SET platform_fee_pct = 20.00;

-- Personal Trainers: Set the default platform_fee_pct for Trainer sessions/programs to 20.00 (20%).
-- As per schema, commission_pct means the percentage the trainer keeps. So platform fee 20% means commission_pct is 80%.
ALTER TABLE trainer_profiles ALTER COLUMN commission_pct SET DEFAULT 80.00;
UPDATE trainer_profiles SET commission_pct = 80.00;

-- Store Vendors: Set the default platform_fee_pct for Store orders to 15.00 (15%).
ALTER TABLE stores ALTER COLUMN platform_fee_pct SET DEFAULT 15.00;
UPDATE stores SET platform_fee_pct = 15.00;


-- 3. Referral System Rewards
-- When a new_user registers using an existing user's referral_code and completes their first paid transaction, 
-- insert a Ledger Entry automatically crediting 50.00 EGP to both the referrer's and the referee's GEM Z Wallets.

CREATE OR REPLACE FUNCTION process_referral_reward()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_referee_id UUID;
    v_referrer_id UUID;
    v_is_first_txn BOOLEAN;
    
    v_referee_wallet_id UUID;
    v_referrer_wallet_id UUID;
    v_platform_wallet_id UUID;
    v_txn_id UUID;
BEGIN
    -- Only trigger when a transaction becomes 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Check if this is the initiator's FIRST completed paid transaction
        SELECT NOT EXISTS (
            SELECT 1 FROM transactions 
            WHERE initiator_user_id = NEW.initiator_user_id 
              AND status = 'completed' 
              AND id != NEW.id
        ) INTO v_is_first_txn;
        
        IF v_is_first_txn THEN
            -- Get referrer info for the initiator
            SELECT id, referred_by_user_id INTO v_referee_id, v_referrer_id
            FROM users WHERE id = NEW.initiator_user_id;
            
            IF v_referrer_id IS NOT NULL THEN
                
                -- Get or create wallet for Referee
                SELECT id INTO v_referee_wallet_id FROM wallets WHERE owner_id = v_referee_id AND owner_type = 'user';
                IF v_referee_wallet_id IS NULL THEN
                    INSERT INTO wallets (owner_type, owner_id) VALUES ('user', v_referee_id) RETURNING id INTO v_referee_wallet_id;
                END IF;

                -- Get or create wallet for Referrer
                SELECT id INTO v_referrer_wallet_id FROM wallets WHERE owner_id = v_referrer_id AND owner_type = 'user';
                IF v_referrer_wallet_id IS NULL THEN
                    INSERT INTO wallets (owner_type, owner_id) VALUES ('user', v_referrer_id) RETURNING id INTO v_referrer_wallet_id;
                END IF;

                -- Get Platform wallet
                SELECT id INTO v_platform_wallet_id FROM wallets WHERE owner_type = 'platform' LIMIT 1;

                IF v_platform_wallet_id IS NOT NULL THEN
                    -- Create a referral bonus parent transaction (100 EGP total)
                    INSERT INTO transactions (txn_type, status, total_amount, currency, description, initiator_user_id)
                    VALUES ('referral_bonus', 'completed', 100.0000, 'EGP', 'Referral Bonus Payout for ' || v_referee_id, v_referrer_id)
                    RETURNING id INTO v_txn_id;

                    -- 1. Give 50 EGP to Referrer (Debit Platform, Credit Referrer)
                    INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance, note)
                    VALUES (
                        v_txn_id, v_platform_wallet_id, 'debit', 50.0000, 
                        (SELECT available_bal - 50.0000 FROM wallets WHERE id = v_platform_wallet_id),
                        'Referral bonus payout to referrer'
                    );
                    UPDATE wallets SET available_bal = available_bal - 50.0000 WHERE id = v_platform_wallet_id;
                    
                    INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance, note)
                    VALUES (
                        v_txn_id, v_referrer_wallet_id, 'credit', 50.0000, 
                        (SELECT available_bal + 50.0000 FROM wallets WHERE id = v_referrer_wallet_id),
                        'Referral bonus received'
                    );
                    UPDATE wallets SET available_bal = available_bal + 50.0000, lifetime_earned = lifetime_earned + 50.0000 WHERE id = v_referrer_wallet_id;

                    -- 2. Give 50 EGP to Referee (Debit Platform, Credit Referee)
                    INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance, note)
                    VALUES (
                        v_txn_id, v_platform_wallet_id, 'debit', 50.0000, 
                        (SELECT available_bal - 50.0000 FROM wallets WHERE id = v_platform_wallet_id),
                        'Referral bonus payout to referee'
                    );
                    UPDATE wallets SET available_bal = available_bal - 50.0000 WHERE id = v_platform_wallet_id;
                    
                    INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance, note)
                    VALUES (
                        v_txn_id, v_referee_wallet_id, 'credit', 50.0000, 
                        (SELECT available_bal + 50.0000 FROM wallets WHERE id = v_referee_wallet_id),
                        'Welcome referral bonus received'
                    );
                    UPDATE wallets SET available_bal = available_bal + 50.0000, lifetime_earned = lifetime_earned + 50.0000 WHERE id = v_referee_wallet_id;
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_reward ON transactions;
CREATE TRIGGER trg_referral_reward
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION process_referral_reward();
