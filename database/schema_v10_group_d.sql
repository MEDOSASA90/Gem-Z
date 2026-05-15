-- =============================================================================
-- GEM Z Database Schema v10 - Group D
-- Features: Social Sharing, In-App Chat, Video Tutorials, Voice Commands, AR Workouts
-- =============================================================================

-- ─── Feature 16: Social Sharing ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS share_links (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('achievement', 'workout', 'progress', 'challenge')),
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    metric VARCHAR(50),
    metric_label VARCHAR(100),
    image_url VARCHAR(500),
    gradient VARCHAR(32) DEFAULT 'neon',
    share_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_user_id ON share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_type ON share_links(type);
CREATE INDEX IF NOT EXISTS idx_share_links_created_at ON share_links(created_at DESC);

CREATE TABLE IF NOT EXISTS share_analytics (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(64) NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    ip_address INET,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_analytics_share_id ON share_analytics(share_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_platform ON share_analytics(platform);

-- ─── Feature 17: In-App Chat ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_participants UNIQUE (participant_one, participant_two),
    CONSTRAINT check_participants CHECK (participant_one < participant_two)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_p1 ON chat_conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_p2 ON chat_conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(16) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'file')),
    file_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(receiver_id, is_read) WHERE is_read = FALSE;

-- ─── Feature 18: Video Tutorials ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_tutorials (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER CHECK (duration > 0 AND duration <= 7200),
    category VARCHAR(32) NOT NULL CHECK (category IN ('workout', 'nutrition', 'technique', 'stretching', 'motivation', 'education', 'yoga', 'cardio', 'strength', 'hiit')),
    tags TEXT[] DEFAULT '{}',
    trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    difficulty VARCHAR(16) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_tutorials_category ON video_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_difficulty ON video_tutorials(difficulty);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_trainer ON video_tutorials(trainer_id);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_published ON video_tutorials(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_tags ON video_tutorials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_search ON video_tutorials USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS video_likes (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(64) NOT NULL REFERENCES video_tutorials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_video_like UNIQUE (video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_likes_video ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes(user_id);

CREATE TABLE IF NOT EXISTS video_transcoding_jobs (
    id VARCHAR(64) PRIMARY KEY,
    video_id VARCHAR(64) NOT NULL REFERENCES video_tutorials(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    resolution VARCHAR(16),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_transcoding_video ON video_transcoding_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_transcoding_status ON video_transcoding_jobs(status);

-- ─── Feature 19: Voice Commands ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS voice_commands (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url VARCHAR(500),
    transcript TEXT NOT NULL,
    intent VARCHAR(32) NOT NULL DEFAULT 'unknown',
    entities JSONB DEFAULT '{}',
    confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000 CHECK (confidence >= 0 AND confidence <= 1),
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    action VARCHAR(200),
    action_result JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_commands_user ON voice_commands(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_commands_intent ON voice_commands(intent);
CREATE INDEX IF NOT EXISTS idx_voice_commands_created ON voice_commands(created_at DESC);

-- ─── Feature 20: AR Workouts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_models (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    model_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    format VARCHAR(8) NOT NULL CHECK (format IN ('glb', 'gltf', 'usdz', 'fbx', 'obj')),
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
    polygon_count INTEGER,
    animation_count INTEGER DEFAULT 0,
    exercise_id UUID,
    body_part VARCHAR(32),
    difficulty VARCHAR(16) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_models_body_part ON ar_models(body_part);
CREATE INDEX IF NOT EXISTS idx_ar_models_difficulty ON ar_models(difficulty);
CREATE INDEX IF NOT EXISTS idx_ar_models_format ON ar_models(format);
CREATE INDEX IF NOT EXISTS idx_ar_models_active ON ar_models(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_models_exercise ON ar_models(exercise_id);

CREATE TABLE IF NOT EXISTS ar_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id VARCHAR(64) NOT NULL REFERENCES ar_models(id) ON DELETE CASCADE,
    exercise_id UUID,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    calories_burned DECIMAL(8,2),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ar_sessions_user ON ar_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_model ON ar_sessions(model_id);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_status ON ar_sessions(status);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_share_links_updated_at') THEN
        CREATE TRIGGER trg_share_links_updated_at
            BEFORE UPDATE ON share_links
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_video_tutorials_updated_at') THEN
        CREATE TRIGGER trg_video_tutorials_updated_at
            BEFORE UPDATE ON video_tutorials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_video_transcoding_jobs_updated_at') THEN
        CREATE TRIGGER trg_video_transcoding_jobs_updated_at
            BEFORE UPDATE ON video_transcoding_jobs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ar_models_updated_at') THEN
        CREATE TRIGGER trg_ar_models_updated_at
            BEFORE UPDATE ON ar_models
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
