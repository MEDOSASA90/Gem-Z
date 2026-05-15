-- ═══════════════════════════════════════════════════════════════
-- GEM Z — Schema v10: Group A Feature Tables
-- ═══════════════════════════════════════════════════════════════
--
-- Tables:
--   1. mediapipe_analyses    — AI exercise form analysis results
--   2. live_streams          — Live streaming sessions
--   3. live_messages         — Live stream chat messages
--   4. wearable_connections  — Wearable device connections
--   5. wearable_health_metrics — Synced health data from wearables
--   6. chatbot_chats         — AI chatbot conversations
--   7. chatbot_conversations — AI chatbot messages
--   8. nutrition_scans       — Food photo nutrition analysis
--
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- 1. MEDIAPIPE ANALYSES
-- ═══════════════════════════════════════════════════════════════
-- Stores AI-powered exercise form analysis results from MediaPipe
-- Pose landmark processing. Includes joint angles, form scores,
-- detected issues, and personalized correction tips.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mediapipe_analyses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_type       VARCHAR(32) NOT NULL CHECK (exercise_type IN (
                            'squat', 'deadlift', 'bench_press', 'overhead_press',
                            'pull_up', 'push_up', 'lunge', 'plank'
                        )),
    overall_score       INT         NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    rep_count           INT         NOT NULL DEFAULT 1 CHECK (rep_count > 0),
    joint_angles        JSONB       NOT NULL DEFAULT '[]',
    issues              JSONB       NOT NULL DEFAULT '[]',
    strengths           JSONB       NOT NULL DEFAULT '[]',
    video_url           TEXT,
    processing_time_ms  INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mediapipe_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mediapipe_user_created
    ON mediapipe_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mediapipe_exercise_type
    ON mediapipe_analyses (exercise_type);
CREATE INDEX IF NOT EXISTS idx_mediapipe_score
    ON mediapipe_analyses (overall_score);
CREATE INDEX IF NOT EXISTS idx_mediapipe_created_date
    ON mediapipe_analyses (DATE(created_at));

COMMENT ON TABLE mediapipe_analyses IS
    'Stores AI-powered exercise form analysis results from MediaPipe Pose landmarks';

-- ═══════════════════════════════════════════════════════════════
-- 2. LIVE STREAMS
-- ═══════════════════════════════════════════════════════════════
-- Manages live streaming sessions with WebRTC support.
-- Tracks stream lifecycle: scheduled -> live -> ended.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS live_streams (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_name           VARCHAR(128) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    thumbnail_url       TEXT,
    status              VARCHAR(16) NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended', 'scheduled')),
    tags                TEXT[]      NOT NULL DEFAULT '{}',
    viewer_count        INT         NOT NULL DEFAULT 0 CHECK (viewer_count >= 0),
    max_viewer_count    INT         NOT NULL DEFAULT 0 CHECK (max_viewer_count >= 0),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    scheduled_for       TIMESTAMPTZ,
    webrtc_room_id      VARCHAR(64),
    stream_key          VARCHAR(128),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_live_stream_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_ended_after_started CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_live_streams_status
    ON live_streams (status);
CREATE INDEX IF NOT EXISTS idx_live_streams_host
    ON live_streams (host_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_active
    ON live_streams (status, started_at DESC) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_live_streams_created
    ON live_streams (created_at DESC);

COMMENT ON TABLE live_streams IS
    'Manages live streaming sessions with WebRTC support';

-- ═══════════════════════════════════════════════════════════════
-- 3. LIVE MESSAGES
-- ═══════════════════════════════════════════════════════════════
-- Real-time chat messages within live streams. Supports
-- moderation and rate limiting.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS live_messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id           UUID        NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name           VARCHAR(128) NOT NULL,
    message             TEXT        NOT NULL CHECK (LENGTH(message) <= 1000),
    message_type        VARCHAR(16) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'reaction', 'system')),
    moderated           BOOLEAN     NOT NULL DEFAULT FALSE,
    moderated_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
    moderated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_live_message_stream FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
    CONSTRAINT fk_live_message_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_live_messages_stream
    ON live_messages (stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_messages_user
    ON live_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_live_messages_created
    ON live_messages (created_at DESC);

COMMENT ON TABLE live_messages IS
    'Real-time chat messages within live streaming sessions';

-- ═══════════════════════════════════════════════════════════════
-- 4. WEARABLE CONNECTIONS
-- ═══════════════════════════════════════════════════════════════
-- Links user accounts to fitness wearable devices (Apple HealthKit,
-- Google Fit, Garmin, Fitbit). Stores OAuth tokens and sync preferences.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wearable_connections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(32) NOT NULL CHECK (provider IN (
                            'apple_healthkit', 'google_fit', 'garmin', 'fitbit'
                        )),
    status              VARCHAR(16) NOT NULL DEFAULT 'disconnected' CHECK (status IN (
                            'connected', 'disconnected', 'expired', 'syncing'
                        )),
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    provider_user_id    VARCHAR(128),
    last_synced_at      TIMESTAMPTZ,
    sync_enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    metrics_enabled     JSONB       NOT NULL DEFAULT '{
                            "steps": true,
                            "heartRate": true,
                            "calories": true,
                            "sleep": true,
                            "workouts": true,
                            "distance": true,
                            "floors": true
                        }'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_wearable_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_wearable_connections_user
    ON wearable_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_status
    ON wearable_connections (status);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_provider
    ON wearable_connections (provider);

COMMENT ON TABLE wearable_connections IS
    'Links user accounts to fitness wearable devices with OAuth tokens';

-- ═══════════════════════════════════════════════════════════════
-- 5. WEARABLE HEALTH METRICS
-- ═══════════════════════════════════════════════════════════════
-- Normalized health data synced from wearable devices. Supports
-- daily aggregation with conflict resolution (UPSERT).
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wearable_health_metrics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id       UUID        NOT NULL REFERENCES wearable_connections(id) ON DELETE CASCADE,
    metric_date         DATE        NOT NULL,
    steps               INT         CHECK (steps >= 0),
    active_minutes      INT         CHECK (active_minutes >= 0),
    calories_burned     INT         CHECK (calories_burned >= 0),
    distance_km         DECIMAL(8, 2),
    floors_climbed      INT         CHECK (floors_climbed >= 0),
    heart_rate_avg      INT         CHECK (heart_rate_avg BETWEEN 30 AND 250),
    heart_rate_min      INT         CHECK (heart_rate_min BETWEEN 30 AND 250),
    heart_rate_max      INT         CHECK (heart_rate_max BETWEEN 30 AND 300),
    sleep_hours         DECIMAL(4, 1) CHECK (sleep_hours BETWEEN 0 AND 24),
    sleep_quality       VARCHAR(16) CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
    workout_count       INT         NOT NULL DEFAULT 0 CHECK (workout_count >= 0),
    workouts            JSONB       DEFAULT '[]',
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_health_metrics_connection FOREIGN KEY (connection_id)
        REFERENCES wearable_connections(id) ON DELETE CASCADE,
    CONSTRAINT unique_connection_date UNIQUE (connection_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_wearable_health_connection_date
    ON wearable_health_metrics (connection_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_health_date
    ON wearable_health_metrics (metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_health_synced
    ON wearable_health_metrics (synced_at DESC);

COMMENT ON TABLE wearable_health_metrics IS
    'Normalized health data synced from wearable devices';

-- ═══════════════════════════════════════════════════════════════
-- 6. CHATBOT CHATS (Conversations)
-- ═══════════════════════════════════════════════════════════════
-- Top-level conversation threads for AI chatbot sessions.
-- Soft-delete via status column.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chatbot_chats (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(200),
    status              VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    model_used          VARCHAR(32) NOT NULL DEFAULT 'gpt-4o-mini',
    system_prompt_hash  VARCHAR(64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_chatbot_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chatbot_chats_user
    ON chatbot_chats (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_chats_status
    ON chatbot_chats (status);

COMMENT ON TABLE chatbot_chats IS
    'Top-level conversation threads for AI chatbot sessions';

-- ═══════════════════════════════════════════════════════════════
-- 7. CHATBOT CONVERSATIONS (Messages)
-- ═══════════════════════════════════════════════════════════════
-- Individual messages within a chatbot conversation.
-- Stores both user messages and AI assistant responses.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID        NOT NULL REFERENCES chatbot_chats(id) ON DELETE CASCADE,
    role                VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content             TEXT        NOT NULL,
    metadata            JSONB,
    token_usage         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_chatbot_message_conversation FOREIGN KEY (conversation_id)
        REFERENCES chatbot_chats(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_conversation
    ON chatbot_conversations (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_role
    ON chatbot_conversations (role);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created
    ON chatbot_conversations (created_at DESC);

COMMENT ON TABLE chatbot_conversations IS
    'Individual messages within AI chatbot conversations';

-- ═══════════════════════════════════════════════════════════════
-- 8. NUTRITION SCANS
-- ═══════════════════════════════════════════════════════════════
-- Food photo nutrition analysis results from OpenAI Vision API.
-- Stores full macro/micro breakdown, health scores, and alternatives.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nutrition_scans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url           TEXT        NOT NULL,
    food_name           VARCHAR(200) NOT NULL,
    confidence          DECIMAL(3, 2) NOT NULL DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
    portion_size        VARCHAR(100) NOT NULL DEFAULT 'Standard serving',
    portion_weight_grams INT        NOT NULL DEFAULT 200 CHECK (portion_weight_grams > 0),
    calories            INT         NOT NULL CHECK (calories >= 0),
    protein             DECIMAL(8, 1),
    carbohydrates       DECIMAL(8, 1),
    fat                 DECIMAL(8, 1),
    fiber               DECIMAL(8, 1),
    sugar               DECIMAL(8, 1),
    sodium              INT         CHECK (sodium >= 0),
    cholesterol         INT         CHECK (cholesterol >= 0),
    health_score        INT         NOT NULL DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
    full_breakdown      JSONB       NOT NULL DEFAULT '{}',
    meal_type           VARCHAR(16) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    user_notes          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_nutrition_scan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nutrition_scans_user
    ON nutrition_scans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_scans_meal_type
    ON nutrition_scans (meal_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_scans_date
    ON nutrition_scans (DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_nutrition_scans_health_score
    ON nutrition_scans (health_score);

COMMENT ON TABLE nutrition_scans IS
    'Food photo nutrition analysis results from OpenAI Vision API';

-- ═══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE mediapipe_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_scans ENABLE ROW LEVEL SECURITY;

-- Note: Application-level authorization is used. Policies are placeholder.
-- In production, integrate with Supabase Auth or add proper RLS policies.

-- ═══════════════════════════════════════════════════════════════
-- UPDATE TRIGGER FOR updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS trg_live_streams_updated ON live_streams;
CREATE TRIGGER trg_live_streams_updated
    BEFORE UPDATE ON live_streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wearable_connections_updated ON wearable_connections;
CREATE TRIGGER trg_wearable_connections_updated
    BEFORE UPDATE ON wearable_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chatbot_chats_updated ON chatbot_chats;
CREATE TRIGGER trg_chatbot_chats_updated
    BEFORE UPDATE ON chatbot_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS VIEW: DAILY NUTRITION SUMMARY
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_daily_nutrition AS
SELECT
    user_id,
    DATE(created_at) AS nutrition_date,
    COUNT(*) AS scan_count,
    SUM(calories) AS total_calories,
    SUM(protein) AS total_protein,
    SUM(carbohydrates) AS total_carbs,
    SUM(fat) AS total_fat,
    SUM(fiber) AS total_fiber,
    AVG(health_score)::INT AS avg_health_score
FROM nutrition_scans
GROUP BY user_id, DATE(created_at);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS VIEW: WEEKLY FORM PROGRESS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_weekly_form_progress AS
SELECT
    user_id,
    exercise_type,
    DATE_TRUNC('week', created_at) AS week_start,
    COUNT(*) AS analysis_count,
    AVG(overall_score)::INT AS avg_score,
    MAX(overall_score) AS best_score,
    AVG(rep_count)::INT AS avg_reps
FROM mediapipe_analyses
GROUP BY user_id, exercise_type, DATE_TRUNC('week', created_at);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS VIEW: STREAM PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_stream_performance AS
SELECT
    host_id,
    id AS stream_id,
    title,
    status,
    viewer_count,
    max_viewer_count,
    started_at,
    ended_at,
    EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60 AS duration_minutes,
    (SELECT COUNT(*) FROM live_messages WHERE stream_id = live_streams.id) AS message_count
FROM live_streams;
