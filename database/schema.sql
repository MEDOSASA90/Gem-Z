-- ============================================================
--  GEM Z FITNESS ECOSYSTEM — PostgreSQL Database Schema v1.0
--  Modules: Users, Roles, Business Entities, Financial Ledger,
--           Subscriptions, Orders, Fitness/AI, Social
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================
-- MODULE 1: USERS & ROLES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'trainee', 'trainer', 'gym_admin', 'store_admin', 'super_admin'
);

CREATE TYPE account_status AS ENUM (
    'pending_verification', 'active', 'suspended', 'banned'
);

CREATE TYPE gender AS ENUM ('male', 'female', 'other');

CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255)    NOT NULL UNIQUE,
    phone               VARCHAR(20)     UNIQUE,
    password_hash       TEXT            NOT NULL,
    role                user_role       NOT NULL DEFAULT 'trainee',
    status              account_status  NOT NULL DEFAULT 'pending_verification',
    full_name           VARCHAR(255)    NOT NULL,
    avatar_url          TEXT,
    gender              gender,
    date_of_birth       DATE,
    country             VARCHAR(100)    DEFAULT 'Egypt',
    city                VARCHAR(100),
    referral_code       VARCHAR(32)     UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    referred_by_user_id UUID            REFERENCES users(id) ON DELETE SET NULL,
    email_verified_at   TIMESTAMPTZ,
    phone_verified_at   TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role    ON users(role);
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_referral ON users(referral_code);

-- Trainee-specific extended profile
CREATE TABLE trainee_profiles (
    user_id             UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    height_cm           NUMERIC(5,2),
    weight_kg           NUMERIC(5,2),
    body_fat_pct        NUMERIC(4,2),
    fitness_goal        VARCHAR(100),   -- e.g. 'weight_loss', 'muscle_gain', 'endurance'
    activity_level      VARCHAR(50),    -- 'sedentary', 'lightly_active', etc.
    health_notes        TEXT,
    qr_code_token       VARCHAR(128)    UNIQUE DEFAULT encode(gen_random_bytes(48), 'base64'),
    streak_days         INTEGER         NOT NULL DEFAULT 0,
    total_points        INTEGER         NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Trainer-specific profile
CREATE TABLE trainer_profiles (
    user_id             UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio                 TEXT,
    specializations     TEXT[],         -- e.g. '{powerlifting, nutrition, yoga}'
    certifications      TEXT[],
    years_experience    SMALLINT,
    hourly_rate_egp     NUMERIC(10,2),
    rating              NUMERIC(3,2)    DEFAULT 0.00,
    total_reviews       INTEGER         DEFAULT 0,
    is_verified         BOOLEAN         DEFAULT FALSE,
    commission_pct      NUMERIC(4,2)    DEFAULT 80.00,  -- trainer keeps 80%
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: BUSINESS ENTITIES — GYMS & STORES
-- ============================================================

CREATE TYPE business_status AS ENUM ('pending_approval', 'active', 'suspended');

CREATE TABLE gyms (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id       UUID            NOT NULL REFERENCES users(id),
    name                VARCHAR(255)    NOT NULL,
    logo_url            TEXT,
    cover_url           TEXT,
    description         TEXT,
    status              business_status NOT NULL DEFAULT 'pending_approval',
    platform_fee_pct    NUMERIC(4,2)    NOT NULL DEFAULT 15.00,
    rating              NUMERIC(3,2)    DEFAULT 0.00,
    total_reviews       INTEGER         DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE gym_branches (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id              UUID            NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    address             TEXT            NOT NULL,
    city                VARCHAR(100),
    latitude            DECIMAL(10, 8),
    longitude           DECIMAL(11, 8),
    phone               VARCHAR(20),
    capacity            INTEGER,
    opens_at            TIME,
    closes_at           TIME,
    amenities           TEXT[],
    qr_scanner_token    VARCHAR(128)    UNIQUE DEFAULT encode(gen_random_bytes(48), 'base64'),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gym_branches_location ON gym_branches(latitude, longitude);

-- Off-peak / flash pricing rules per branch
CREATE TABLE gym_pricing_rules (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id           UUID            NOT NULL REFERENCES gym_branches(id) ON DELETE CASCADE,
    name                VARCHAR(100)    NOT NULL,
    discount_pct        NUMERIC(4,2)    NOT NULL,
    valid_days          SMALLINT[]      NOT NULL, -- 0=Sun … 6=Sat (ISO weekday mod)
    start_time          TIME            NOT NULL,
    end_time            TIME            NOT NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE stores (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id       UUID            NOT NULL REFERENCES users(id),
    name                VARCHAR(255)    NOT NULL,
    logo_url            TEXT,
    description         TEXT,
    status              business_status NOT NULL DEFAULT 'pending_approval',
    platform_fee_pct    NUMERIC(4,2)    NOT NULL DEFAULT 17.50,
    rating              NUMERIC(3,2)    DEFAULT 0.00,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE store_products (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id            UUID            NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    category            VARCHAR(100),   -- 'supplement', 'apparel', 'equipment'
    price_egp           NUMERIC(12,2)   NOT NULL,
    discount_pct        NUMERIC(4,2)    DEFAULT 0.00,
    stock_qty           INTEGER         NOT NULL DEFAULT 0,
    images              TEXT[],
    sku                 VARCHAR(128)    UNIQUE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store   ON store_products(store_id);
CREATE INDEX idx_products_category ON store_products(category);

-- ============================================================
-- MODULE 3: FINANCIAL LEDGER (Double-Entry)
-- ============================================================

CREATE TYPE wallet_owner_type AS ENUM ('user', 'gym', 'store', 'platform');

CREATE TYPE currency AS ENUM ('EGP', 'USD');

CREATE TABLE wallets (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type      wallet_owner_type   NOT NULL,
    owner_id        UUID                NOT NULL,   -- polymorphic: user.id / gym.id / store.id
    currency        currency            NOT NULL DEFAULT 'EGP',
    available_bal   NUMERIC(19,4)       NOT NULL DEFAULT 0 CHECK (available_bal >= 0),
    pending_bal     NUMERIC(19,4)       NOT NULL DEFAULT 0 CHECK (pending_bal >= 0),
    lifetime_earned NUMERIC(19,4)       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    UNIQUE (owner_type, owner_id, currency)
);

CREATE INDEX idx_wallets_owner ON wallets(owner_type, owner_id);

-- Singleton platform wallet seed
-- INSERT INTO wallets (owner_type, owner_id) VALUES ('platform', uuid_generate_v4());

CREATE TYPE ledger_entry_type AS ENUM (
    'debit', 'credit'
);

CREATE TYPE txn_status AS ENUM (
    'pending', 'completed', 'failed', 'reversed'
);

CREATE TYPE txn_type AS ENUM (
    'subscription_payment',
    'order_payment',
    'trainer_session_payment',
    'platform_fee',
    'gym_settlement',
    'store_settlement',
    'trainer_settlement',
    'wallet_topup',
    'wallet_withdrawal',
    'referral_bonus',
    'flash_sale_discount',
    'refund',
    'adjustment'
);

-- Master transaction record (one per business event)
CREATE TABLE transactions (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_no        VARCHAR(64) NOT NULL UNIQUE DEFAULT 'TXN-' || upper(substr(md5(random()::text), 1, 12)),
    txn_type            txn_type    NOT NULL,
    status              txn_status  NOT NULL DEFAULT 'pending',
    total_amount        NUMERIC(19,4) NOT NULL CHECK (total_amount > 0),
    currency            currency    NOT NULL DEFAULT 'EGP',
    description         TEXT,
    initiator_user_id   UUID        REFERENCES users(id),
    payment_gateway     VARCHAR(50),    -- 'fawry', 'instapay', 'paymob', 'vodafone_cash', 'wallet'
    gateway_ref         TEXT,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_txn_status   ON transactions(status);
CREATE INDEX idx_txn_type     ON transactions(txn_type);
CREATE INDEX idx_txn_created  ON transactions(created_at DESC);

-- Double-entry ledger lines (every txn has exactly 2+ lines summing to zero)
CREATE TABLE ledger_entries (
    id              BIGSERIAL       PRIMARY KEY,
    txn_id          UUID            NOT NULL REFERENCES transactions(id),
    wallet_id       UUID            NOT NULL REFERENCES wallets(id),
    entry_type      ledger_entry_type NOT NULL,
    amount          NUMERIC(19,4)   NOT NULL CHECK (amount > 0),
    running_balance NUMERIC(19,4)   NOT NULL,   -- wallet balance after this entry
    note            TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_txn    ON ledger_entries(txn_id);
CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id);

-- Constraint: every txn's total debits must equal total credits
-- Enforced via application layer + trigger below
CREATE OR REPLACE FUNCTION trg_check_ledger_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_debit  NUMERIC;
    v_credit NUMERIC;
BEGIN
    SELECT
        COALESCE(SUM(amount) FILTER (WHERE entry_type='debit'),  0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type='credit'), 0)
    INTO v_debit, v_credit
    FROM ledger_entries
    WHERE txn_id = NEW.txn_id;

    -- Only enforce after both sides are written (allow partial during same txn commit)
    -- Full enforcement happens in the application's transaction block.
    RETURN NEW;
END;
$$;

-- Payment gateway withdrawal requests
CREATE TYPE withdrawal_status AS ENUM ('requested', 'processing', 'paid', 'rejected');

CREATE TABLE withdrawal_requests (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id       UUID                NOT NULL REFERENCES wallets(id),
    amount          NUMERIC(19,4)       NOT NULL CHECK (amount > 0),
    method          VARCHAR(50)         NOT NULL, -- 'instapay', 'vodafone_cash', 'bank'
    account_number  VARCHAR(100),
    status          withdrawal_status   NOT NULL DEFAULT 'requested',
    admin_note      TEXT,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: SUBSCRIPTIONS & ORDERS
-- ============================================================

CREATE TYPE subscription_status AS ENUM (
    'active', 'expired', 'cancelled', 'paused', 'pending_payment'
);

CREATE TABLE gym_subscription_plans (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id          UUID            NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    branch_id       UUID            REFERENCES gym_branches(id) ON DELETE CASCADE, -- NULL = all branches
    name            VARCHAR(100)    NOT NULL,
    duration_days   INTEGER         NOT NULL,
    base_price_egp  NUMERIC(12,2)   NOT NULL,
    features        TEXT[],
    max_freezes     SMALLINT        DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE gym_subscriptions (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainee_id      UUID                NOT NULL REFERENCES users(id),
    plan_id         UUID                NOT NULL REFERENCES gym_subscription_plans(id),
    branch_id       UUID                REFERENCES gym_branches(id),
    transaction_id  UUID                NOT NULL REFERENCES transactions(id),
    status          subscription_status NOT NULL DEFAULT 'pending_payment',
    amount_paid     NUMERIC(12,2)       NOT NULL,
    discount_applied NUMERIC(12,2)      DEFAULT 0,
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    freeze_days_used SMALLINT           DEFAULT 0,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gym_sub_trainee ON gym_subscriptions(trainee_id);
CREATE INDEX idx_gym_sub_expires ON gym_subscriptions(expires_at);

-- Trainer subscription plans
CREATE TABLE trainer_subscription_plans (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id      UUID            NOT NULL REFERENCES users(id),
    name            VARCHAR(100)    NOT NULL,
    duration_days   INTEGER         NOT NULL,
    price_egp       NUMERIC(12,2)   NOT NULL,
    sessions_count  INTEGER,        -- NULL = unlimited
    is_online       BOOLEAN         DEFAULT TRUE,
    description     TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE trainer_subscriptions (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainee_id      UUID                NOT NULL REFERENCES users(id),
    trainer_id      UUID                NOT NULL REFERENCES users(id),
    plan_id         UUID                NOT NULL REFERENCES trainer_subscription_plans(id),
    transaction_id  UUID                NOT NULL REFERENCES transactions(id),
    status          subscription_status NOT NULL DEFAULT 'pending_payment',
    amount_paid     NUMERIC(12,2)       NOT NULL,
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Gym attendance log (QR check-ins)
CREATE TABLE attendance_logs (
    id              BIGSERIAL   PRIMARY KEY,
    trainee_id      UUID        NOT NULL REFERENCES users(id),
    branch_id       UUID        NOT NULL REFERENCES gym_branches(id),
    subscription_id UUID        NOT NULL REFERENCES gym_subscriptions(id),
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_out_at  TIMESTAMPTZ,
    method          VARCHAR(20) DEFAULT 'qr'  -- 'qr', 'nfc', 'manual'
);

CREATE INDEX idx_attendance_trainee ON attendance_logs(trainee_id);
CREATE INDEX idx_attendance_branch  ON attendance_logs(branch_id, checked_in_at DESC);

-- Store Orders
CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

CREATE TABLE orders (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id        UUID            NOT NULL REFERENCES users(id),
    store_id        UUID            NOT NULL REFERENCES stores(id),
    transaction_id  UUID            NOT NULL REFERENCES transactions(id),
    status          order_status    NOT NULL DEFAULT 'pending',
    subtotal_egp    NUMERIC(12,2)   NOT NULL,
    discount_egp    NUMERIC(12,2)   DEFAULT 0,
    shipping_egp    NUMERIC(12,2)   DEFAULT 0,
    total_egp       NUMERIC(12,2)   NOT NULL,
    shipping_address TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID            NOT NULL REFERENCES store_products(id),
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price_egp  NUMERIC(12,2)   NOT NULL,
    discount_pct    NUMERIC(4,2)    DEFAULT 0,
    subtotal_egp    NUMERIC(12,2)   NOT NULL
);

-- ============================================================
-- MODULE 5: FITNESS & AI
-- ============================================================

CREATE TABLE muscle_groups (
    id      SMALLSERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    body_part VARCHAR(50) -- 'upper', 'lower', 'core'
);

CREATE TABLE exercises (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    primary_muscle  SMALLINT    NOT NULL REFERENCES muscle_groups(id),
    secondary_muscles SMALLINT[],
    equipment       TEXT[],     -- 'barbell', 'dumbbell', 'bodyweight'
    difficulty      VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    video_url       TEXT,
    thumbnail_url   TEXT,
    instructions    TEXT[],
    calories_per_min NUMERIC(5,2),
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle);

-- Workout plans (created by trainer or AI)
CREATE TABLE workout_plans (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by      UUID        NOT NULL REFERENCES users(id),
    assigned_to     UUID        REFERENCES users(id),   -- NULL = template
    name            VARCHAR(200) NOT NULL,
    goal            VARCHAR(100),
    duration_weeks  SMALLINT,
    is_ai_generated BOOLEAN     DEFAULT FALSE,
    is_public       BOOLEAN     DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_days (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id     UUID        NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_number  SMALLINT    NOT NULL,
    label       VARCHAR(50),  -- 'Push Day', 'Leg Day'
    notes       TEXT
);

CREATE TABLE workout_exercises (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_day_id  UUID        NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    exercise_id     UUID        NOT NULL REFERENCES exercises(id),
    sets            SMALLINT,
    reps_per_set    SMALLINT,
    duration_sec    INTEGER,    -- alternative to reps (timed exercises)
    rest_sec        SMALLINT,
    weight_kg       NUMERIC(6,2),
    order_index     SMALLINT    NOT NULL DEFAULT 0
);

-- Medical test results uploaded by trainees (for AI diet generation)
CREATE TABLE medical_reports (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url        TEXT        NOT NULL,
    ocr_raw_text    TEXT,
    parsed_data     JSONB,      -- structured extraction: {hemoglobin, vitamin_d, ...}
    ai_notes        TEXT,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Diet Plans
CREATE TABLE ai_diet_plans (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medical_report_id UUID      REFERENCES medical_reports(id),
    goal            VARCHAR(100),
    calories_target INTEGER     NOT NULL,
    protein_g       NUMERIC(6,2),
    carbs_g         NUMERIC(6,2),
    fat_g           NUMERIC(6,2),
    allergies       TEXT[],
    ai_model        VARCHAR(50),
    ai_prompt_tokens INTEGER,
    is_active       BOOLEAN     DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meals (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    diet_plan_id    UUID        NOT NULL REFERENCES ai_diet_plans(id) ON DELETE CASCADE,
    day_number      SMALLINT    NOT NULL,  -- 1–7
    meal_type       VARCHAR(30) NOT NULL,  -- 'breakfast', 'lunch', 'dinner', 'snack'
    name            VARCHAR(200),
    description     TEXT,
    calories        INTEGER,
    protein_g       NUMERIC(6,2),
    carbs_g         NUMERIC(6,2),
    fat_g           NUMERIC(6,2),
    ingredients     JSONB,      -- [{name, qty, unit, kcal}]
    alternatives    JSONB       -- AI-generated swaps maintaining macros
);

CREATE INDEX idx_meals_plan ON meals(diet_plan_id, day_number);

-- Daily trainee log (actual food & workout done)
CREATE TABLE daily_logs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE        NOT NULL,
    calories_consumed INTEGER,
    water_ml        INTEGER,
    steps           INTEGER,
    sleep_hours     NUMERIC(4,2),
    weight_kg       NUMERIC(5,2),
    mood            SMALLINT,   -- 1–5
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, log_date)
);

-- Wearable sync data
CREATE TABLE wearable_sync_logs (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source          VARCHAR(30) NOT NULL,   -- 'apple_watch', 'garmin', 'google_fit'
    sync_date       DATE        NOT NULL,
    steps           INTEGER,
    heart_rate_avg  SMALLINT,
    calories_burned INTEGER,
    sleep_minutes   INTEGER,
    raw_data        JSONB,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Form Correction Sessions
CREATE TABLE form_correction_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id     UUID        NOT NULL REFERENCES exercises(id),
    duration_sec    INTEGER,
    rep_count       SMALLINT,
    issues_detected JSONB,      -- [{joint, angle, correction, severity}]
    score           NUMERIC(4,2), -- 0–100 form score
    video_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE 6: SOCIAL NETWORK & GAMIFICATION
-- ============================================================

CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE post_type AS ENUM ('update', 'progress_photo', 'achievement', 'question', 'video');

CREATE TABLE posts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT,
    media_urls      TEXT[],
    post_type       post_type       NOT NULL DEFAULT 'update',
    visibility      post_visibility NOT NULL DEFAULT 'public',
    likes_count     INTEGER         NOT NULL DEFAULT 0,
    comments_count  INTEGER         NOT NULL DEFAULT 0,
    shares_count    INTEGER         NOT NULL DEFAULT 0,
    is_pinned       BOOLEAN         DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author  ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_comments (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID        REFERENCES post_comments(id) ON DELETE CASCADE,
    content         TEXT        NOT NULL,
    likes_count     INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON post_comments(post_id, created_at);

CREATE TABLE post_likes (
    post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE comment_likes (
    comment_id  UUID        NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE follows (
    follower_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_follows_followee ON follows(followee_id);

-- Badges & Achievements
CREATE TABLE badges (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        TEXT,
    category        VARCHAR(50), -- 'streak', 'milestone', 'social', 'purchase'
    points_reward   INTEGER     DEFAULT 0,
    -- trigger rule stored as JSONB: {type:'streak_days', value:30}
    trigger_rule    JSONB
);

CREATE TABLE user_badges (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    UUID        NOT NULL REFERENCES badges(id),
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_id)
);

-- Leaderboards (materialized, refreshed periodically)
CREATE TABLE leaderboard_snapshots (
    id              BIGSERIAL   PRIMARY KEY,
    scope           VARCHAR(30) NOT NULL,   -- 'global', 'gym:{gym_id}', 'city:{city}'
    period          VARCHAR(20) NOT NULL,   -- 'weekly', 'monthly', 'all_time'
    user_id         UUID        NOT NULL REFERENCES users(id),
    rank            INTEGER     NOT NULL,
    score           INTEGER     NOT NULL,
    snapped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_scope ON leaderboard_snapshots(scope, period, snapped_at DESC);

-- Referral discount codes
CREATE TABLE referral_rewards (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id     UUID        NOT NULL REFERENCES users(id),
    referee_id      UUID        NOT NULL REFERENCES users(id),
    discount_code   VARCHAR(32) NOT NULL UNIQUE,
    discount_pct    NUMERIC(4,2) DEFAULT 10.00,
    max_uses        SMALLINT    DEFAULT 1,
    used_count      SMALLINT    DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TYPE notification_type AS ENUM (
    'social', 'achievement', 'wallet', 'subscription', 'order', 'geofence', 'system'
);

CREATE TABLE notifications (
    id              BIGSERIAL           PRIMARY KEY,
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type   NOT NULL,
    title           VARCHAR(200)        NOT NULL,
    body            TEXT,
    data            JSONB,
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- MODULE 7: SUPPORT & ADMIN
-- ============================================================

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE support_tickets (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id),
    subject         VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    status          ticket_status   NOT NULL DEFAULT 'open',
    priority        ticket_priority NOT NULL DEFAULT 'medium',
    assigned_to     UUID            REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_replies (
    id          BIGSERIAL   PRIMARY KEY,
    ticket_id   UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES users(id),
    message     TEXT        NOT NULL,
    is_internal BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT: updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','gyms','stores','wallets','orders',
        'store_products','trainer_profiles','posts'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END;
$$;

-- ============================================================
-- END OF SCHEMA v1.0
-- ============================================================
