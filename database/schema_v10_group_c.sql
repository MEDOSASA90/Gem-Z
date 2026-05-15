-- ============================================
-- Gem Z — Schema v10: Group C Features
-- Meal Planning, Sleep Tracking, Water Tracker,
-- Community Challenges, Badges System
-- ============================================

-- Drop tables if they exist for clean migration
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS challenge_participants CASCADE;
DROP TABLE IF EXISTS community_challenges CASCADE;
DROP TABLE IF EXISTS water_reminders CASCADE;
DROP TABLE IF EXISTS water_logs CASCADE;
DROP TABLE IF EXISTS sleep_logs CASCADE;
DROP TABLE IF EXISTS meal_items CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;

-- ─── Meal Plans ───────────────────────────────────────────────
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    calorie_target INTEGER NOT NULL CHECK (calorie_target >= 800 AND calorie_target <= 8000),
    dietary_preference VARCHAR(50) NOT NULL DEFAULT 'balanced'
        CHECK (dietary_preference IN ('balanced', 'keto', 'vegan', 'vegetarian', 'paleo', 'mediterranean', 'low-carb', 'high-protein')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Meal Items ───────────────────────────────────────────────
CREATE TABLE meal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    meal_type VARCHAR(20) NOT NULL
        CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    calories INTEGER NOT NULL CHECK (calories >= 0),
    protein NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carbs NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fats NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ingredients TEXT[] DEFAULT '{}',
    prep_time INTEGER NOT NULL DEFAULT 0,
    recipe_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Sleep Logs ───────────────────────────────────────────────
CREATE TABLE sleep_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bed_time TIMESTAMPTZ NOT NULL,
    wake_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    quality INTEGER NOT NULL CHECK (quality >= 1 AND quality <= 10),
    deep_sleep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (deep_sleep_minutes >= 0),
    light_sleep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (light_sleep_minutes >= 0),
    rem_sleep_minutes INTEGER NOT NULL DEFAULT 0 CHECK (rem_sleep_minutes >= 0),
    awake_minutes INTEGER NOT NULL DEFAULT 0 CHECK (awake_minutes >= 0),
    factors TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bed_before_wake CHECK (bed_time < wake_time)
);

-- ─── Water Logs ───────────────────────────────────────────────
CREATE TABLE water_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml >= 10 AND amount_ml <= 5000),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'reminder', 'wearable')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Water Reminders ──────────────────────────────────────────
CREATE TABLE water_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes >= 15 AND interval_minutes <= 240),
    start_time TIME NOT NULL DEFAULT '08:00',
    end_time TIME NOT NULL DEFAULT '22:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Community Challenges ─────────────────────────────────────
CREATE TABLE community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(20) NOT NULL
        CHECK (challenge_type IN ('steps', 'distance', 'calories', 'workouts', 'water', 'sleep', 'custom')),
    target_value NUMERIC(15, 4) NOT NULL CHECK (target_value > 0),
    unit VARCHAR(50) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
    reward TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (start_date < end_date)
);

-- ─── Challenge Participants ───────────────────────────────────
CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress NUMERIC(15, 4) NOT NULL DEFAULT 0 CHECK (progress >= 0),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

-- ─── Badges ───────────────────────────────────────────────────
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL DEFAULT 'emoji_events',
    color VARCHAR(50) NOT NULL DEFAULT '#FFD700',
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('fitness', 'nutrition', 'social', 'sleep', 'hydration', 'consistency', 'milestone')),
    criteria JSONB NOT NULL DEFAULT '{}',
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
    tier VARCHAR(20) NOT NULL DEFAULT 'bronze'
        CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Badges ──────────────────────────────────────────────
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- ─── Add water_goal_ml to trainee_profiles ────────────────────
ALTER TABLE trainee_profiles
    ADD COLUMN IF NOT EXISTS water_goal_ml INTEGER DEFAULT 2500 CHECK (water_goal_ml IS NULL OR (water_goal_ml >= 500 AND water_goal_ml <= 10000));

-- ─── Indexes ──────────────────────────────────────────────────

-- Meal plans
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plans_week_start ON meal_plans(week_start DESC);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);

-- Meal items
CREATE INDEX idx_meal_items_plan_id ON meal_items(plan_id);
CREATE INDEX idx_meal_items_day_type ON meal_items(plan_id, day_of_week, meal_type);

-- Sleep logs
CREATE INDEX idx_sleep_logs_user_id ON sleep_logs(user_id);
CREATE INDEX idx_sleep_logs_bed_time ON sleep_logs(bed_time DESC);
CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, bed_time DESC);

-- Water logs
CREATE INDEX idx_water_logs_user_id ON water_logs(user_id);
CREATE INDEX idx_water_logs_logged_at ON water_logs(logged_at DESC);
CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, logged_at DESC);

-- Water reminders
CREATE INDEX idx_water_reminders_user_id ON water_reminders(user_id);

-- Community challenges
CREATE INDEX idx_community_challenges_status ON community_challenges(status);
CREATE INDEX idx_community_challenges_type ON community_challenges(challenge_type);
CREATE INDEX idx_community_challenges_created_by ON community_challenges(created_by);
CREATE INDEX idx_community_challenges_dates ON community_challenges(start_date, end_date);

-- Challenge participants
CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_progress ON challenge_participants(challenge_id, progress DESC);

-- Badges
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_tier ON badges(tier);

-- User badges
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- ─── Update Triggers ──────────────────────────────────────────

CREATE TRIGGER update_meal_plans_updated_at
    BEFORE UPDATE ON meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_water_reminders_updated_at
    BEFORE UPDATE ON water_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_challenges_updated_at
    BEFORE UPDATE ON community_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Comments ─────────────────────────────────────────────────

COMMENT ON TABLE meal_plans IS 'Weekly meal plans generated by AI for users';
COMMENT ON TABLE meal_items IS 'Individual meals within a meal plan';
COMMENT ON TABLE sleep_logs IS 'User sleep tracking entries with quality scores';
COMMENT ON TABLE water_logs IS 'Daily water intake tracking entries';
COMMENT ON TABLE water_reminders IS 'User-configurable water drinking reminders';
COMMENT ON TABLE community_challenges IS 'Community-wide fitness challenges';
COMMENT ON TABLE challenge_participants IS 'User participation records in community challenges';
COMMENT ON TABLE badges IS 'Available gamification badges and their criteria';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
