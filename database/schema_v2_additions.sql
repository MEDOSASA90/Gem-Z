-- ============================================================
--  GEM Z — Schema Additions v2.0
--  New Features: Coins, Challenges, Flash Sales, Recipes, Corporates
-- ============================================================

-- ============================================================
-- MODULE 8: GEM Z COINS SYSTEM
-- ============================================================

CREATE TABLE gem_z_coins_ledger (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          INTEGER         NOT NULL,   -- positive = earn, negative = spend
    reason          VARCHAR(100)    NOT NULL,   -- 'workout_complete', 'streak_bonus', 'referral', 'challenge_win', 'redemption'
    reference_id    UUID,                       -- optional: workout_log.id, challenge.id, etc.
    balance_after   INTEGER         NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coins_user ON gem_z_coins_ledger(user_id, created_at DESC);

-- Coins balance denormalized for fast reads (updated via trigger on coins_ledger insert)
ALTER TABLE trainee_profiles ADD COLUMN IF NOT EXISTS gems_coins INTEGER NOT NULL DEFAULT 0;

-- Coins redemption catalog
CREATE TABLE coins_rewards (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    name_ar         VARCHAR(200),
    description     TEXT,
    description_ar  TEXT,
    coins_cost      INTEGER     NOT NULL,
    reward_type     VARCHAR(50) NOT NULL, -- 'wallet_credit', 'discount_code', 'free_class', 'merchandise'
    reward_value    NUMERIC(10,2),        -- EGP equivalent or discount %
    stock           INTEGER     DEFAULT NULL,  -- NULL = unlimited
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coins_redemptions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id),
    reward_id       UUID        NOT NULL REFERENCES coins_rewards(id),
    coins_spent     INTEGER     NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'fulfilled', 'cancelled'
    discount_code   VARCHAR(32),
    fulfilled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE 9: COMMUNITY CHALLENGES
-- ============================================================

CREATE TYPE challenge_type AS ENUM (
    'individual', 'gym_vs_gym', 'city_vs_city', 'team'
);

CREATE TYPE challenge_status AS ENUM (
    'upcoming', 'active', 'ended', 'cancelled'
);

CREATE TABLE challenges (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(200)    NOT NULL,
    title_ar        VARCHAR(200),
    description     TEXT,
    description_ar  TEXT,
    challenge_type  challenge_type  NOT NULL DEFAULT 'individual',
    metric          VARCHAR(100)    NOT NULL,   -- 'weight_lost_kg', 'sessions_count', 'steps_total', 'reps_count'
    goal_value      NUMERIC(10,2),              -- Optional target value per participant
    status          challenge_status NOT NULL DEFAULT 'upcoming',
    starts_at       TIMESTAMPTZ     NOT NULL,
    ends_at         TIMESTAMPTZ     NOT NULL,
    max_participants INTEGER,
    entry_fee_egp   NUMERIC(10,2)   DEFAULT 0,
    prize_pool_egp  NUMERIC(12,2)   DEFAULT 0,
    prize_description TEXT,
    prize_description_ar TEXT,
    badge_id        UUID            REFERENCES badges(id),
    coins_bonus     INTEGER         DEFAULT 0,
    created_by      UUID            REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_status ON challenges(status, starts_at);

CREATE TABLE challenge_participants (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id    UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gym_id          UUID        REFERENCES gyms(id),     -- for gym_vs_gym
    current_score   NUMERIC(12,4) NOT NULL DEFAULT 0,
    rank            INTEGER,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed       BOOLEAN     DEFAULT FALSE,
    UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants ON challenge_participants(challenge_id, current_score DESC);

CREATE TABLE challenge_progress_logs (
    id              BIGSERIAL   PRIMARY KEY,
    participant_id  UUID        NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
    value           NUMERIC(10,4) NOT NULL,   -- e.g., 0.3 kg lost
    log_date        DATE        NOT NULL,
    source          VARCHAR(30) DEFAULT 'manual',  -- 'manual', 'wearable', 'ai_form'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE 10: FLASH SALES & TIME-LIMITED DEALS
-- ============================================================

CREATE TYPE flash_sale_target AS ENUM ('gym_subscription', 'trainer_subscription', 'store_product');

CREATE TABLE flash_sales (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(200)        NOT NULL,
    title_ar        VARCHAR(200),
    target_type     flash_sale_target   NOT NULL,
    target_id       UUID                NOT NULL,   -- gym_subscription_plans.id / store_products.id / trainer_subscription_plans.id
    discount_pct    NUMERIC(4,2)        NOT NULL,
    original_price  NUMERIC(12,2)       NOT NULL,
    sale_price      NUMERIC(12,2)       NOT NULL,
    total_slots     INTEGER             NOT NULL,
    slots_sold      INTEGER             NOT NULL DEFAULT 0,
    starts_at       TIMESTAMPTZ         NOT NULL,
    ends_at         TIMESTAMPTZ         NOT NULL,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_by      UUID                REFERENCES users(id),  -- gym_admin / store_admin / super_admin
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flash_sales_active ON flash_sales(is_active, ends_at);
CREATE INDEX idx_flash_sales_target ON flash_sales(target_type, target_id);

CREATE TABLE flash_sale_purchases (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id         UUID        NOT NULL REFERENCES flash_sales(id),
    buyer_id        UUID        NOT NULL REFERENCES users(id),
    transaction_id  UUID        NOT NULL REFERENCES transactions(id),
    amount_paid     NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sale_id, buyer_id)
);

-- Off-peak pricing should auto-create a flash_sale for gym branches
-- Handled by application layer checking gym_pricing_rules.

-- ============================================================
-- MODULE 11: VIDEO RECIPE LIBRARY
-- ============================================================

CREATE TABLE recipe_categories (
    id      SMALLSERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    icon    TEXT
);

INSERT INTO recipe_categories (name, name_ar, icon) VALUES
    ('Breakfast', 'إفطار', '🌅'),
    ('Lunch', 'غداء', '🍗'),
    ('Dinner', 'عشاء', '🍽️'),
    ('Snack', 'سناك', '🥪'),
    ('Smoothie', 'سموذي', '🥤'),
    ('Pre-Workout', 'قبل التمرين', '⚡'),
    ('Post-Workout', 'بعد التمرين', '💪');

CREATE TABLE recipes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    name_ar         VARCHAR(200),
    description     TEXT,
    description_ar  TEXT,
    category_id     SMALLINT    NOT NULL REFERENCES recipe_categories(id),
    prep_time_min   SMALLINT,
    cook_time_min   SMALLINT,
    calories        INTEGER     NOT NULL,
    protein_g       NUMERIC(6,2),
    carbs_g         NUMERIC(6,2),
    fat_g           NUMERIC(6,2),
    difficulty      VARCHAR(20),   -- 'easy', 'medium', 'hard'
    ingredients     JSONB       NOT NULL,  -- [{name, qty, unit, kcal}]
    steps           JSONB       NOT NULL,  -- [{step_num, instruction, instruction_ar}]
    video_url       TEXT,
    thumbnail_url   TEXT,
    tags            TEXT[],                -- 'high-protein', 'vegan', 'quick', 'gluten-free'
    tags_ar         TEXT[],
    rating          NUMERIC(3,2) DEFAULT 0,
    total_reviews   INTEGER      DEFAULT 0,
    created_by      UUID         REFERENCES users(id),  -- trainer or admin
    is_ai_suggested BOOLEAN      DEFAULT FALSE,
    -- AI links: this recipe might be suggested by AI diet plans
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_calories ON recipes(calories);

CREATE TABLE recipe_saves (
    recipe_id   UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (recipe_id, user_id)
);

-- ============================================================
-- MODULE 12: CORPORATE FITNESS PLANS
-- ============================================================

CREATE TYPE corporate_status AS ENUM ('prospect', 'active', 'churned', 'suspended');

CREATE TABLE corporate_accounts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    VARCHAR(255)    NOT NULL,
    industry        VARCHAR(100),
    tax_id          VARCHAR(50)     UNIQUE,
    contact_email   VARCHAR(255)    NOT NULL,
    contact_phone   VARCHAR(20),
    address         TEXT,
    status          corporate_status NOT NULL DEFAULT 'prospect',
    assigned_to     UUID            REFERENCES users(id),  -- account manager (super_admin employee)
    contract_starts TIMESTAMPTZ,
    contract_ends   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE corporate_subscription_plans (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_id    UUID            NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,
    price_per_employee_egp NUMERIC(10,2) NOT NULL,
    max_employees   INTEGER         NOT NULL,
    includes        TEXT[],         -- '{gym_access, diet_plans, trainer_sessions}'
    gym_ids         UUID[],         -- partner gyms included
    duration_months SMALLINT        NOT NULL DEFAULT 12,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE corporate_employees (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_id    UUID        NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id         UUID        NOT NULL REFERENCES corporate_subscription_plans(id),
    status          subscription_status NOT NULL DEFAULT 'active',
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    UNIQUE (corporate_id, user_id)
);

-- ============================================================
-- MODULE 13: BODY PROGRESS TRACKING (Before/After)
-- ============================================================

CREATE TABLE body_progress_entries (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE        NOT NULL,
    weight_kg       NUMERIC(5,2),
    body_fat_pct    NUMERIC(4,2),
    muscle_mass_pct NUMERIC(4,2),
    bmi             NUMERIC(4,2),
    waist_cm        NUMERIC(5,2),
    chest_cm        NUMERIC(5,2),
    arms_cm         NUMERIC(5,2),
    thighs_cm       NUMERIC(5,2),
    photo_url       TEXT,           -- optional: progress photo
    is_public       BOOLEAN     DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_body_progress_user ON body_progress_entries(user_id, log_date DESC);

-- ============================================================
-- MODULE 14: GEOFENCING & PUSH NOTIFICATIONS
-- ============================================================

CREATE TABLE geofence_zones (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id   UUID    NOT NULL REFERENCES gym_branches(id) ON DELETE CASCADE,
    radius_m    INTEGER NOT NULL DEFAULT 200,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    -- Zone center is the branch.location (PostGIS)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT        NOT NULL,
    p256dh          TEXT        NOT NULL,
    auth            TEXT        NOT NULL,
    device_type     VARCHAR(20) DEFAULT 'web',  -- 'web', 'ios', 'android'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

CREATE TABLE push_notification_logs (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    type            notification_type NOT NULL,
    payload         JSONB,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clicked_at      TIMESTAMPTZ
);

CREATE INDEX idx_push_logs_user ON push_notification_logs(user_id, sent_at DESC);

-- ============================================================
-- TRIGGERS: Extend updated_at to new tables
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'challenges', 'flash_sales', 'recipes', 'corporate_accounts', 'corporate_subscription_plans'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END;
$$;

-- ============================================================
-- END OF SCHEMA ADDITIONS v2.0
-- ============================================================
