-- ═══════════════════════════════════════════════════════════════
-- GEM Z — Schema v11 Phase 8B
-- Features: Body Scan 3D, Music Integration, Gift Cards,
--           Nutritionist Consultation, Emergency SOS
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. BODY SCAN 3D TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS body_scans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    front_photo_url     TEXT NOT NULL,
    side_photo_url      TEXT,
    back_photo_url      TEXT,
    scan_status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (scan_status IN ('pending', 'processing', 'completed', 'failed')),
    body_fat_percent    NUMERIC(5,2),
    muscle_mass_kg      NUMERIC(5,2),
    bone_mass_kg        NUMERIC(5,2),
    water_percent       NUMERIC(5,2),
    bmi                 NUMERIC(5,2),
    ai_analysis_json    JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_body_scans_user_id ON body_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_body_scans_created_at ON body_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_scans_status ON body_scans(scan_status);

CREATE TABLE IF NOT EXISTS body_measurements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id             UUID NOT NULL REFERENCES body_scans(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chest_cm            NUMERIC(6,2),
    waist_cm            NUMERIC(6,2),
    hips_cm             NUMERIC(6,2),
    left_arm_cm         NUMERIC(6,2),
    right_arm_cm        NUMERIC(6,2),
    left_thigh_cm       NUMERIC(6,2),
    right_thigh_cm      NUMERIC(6,2),
    left_calf_cm        NUMERIC(6,2),
    right_calf_cm       NUMERIC(6,2),
    shoulders_cm        NUMERIC(6,2),
    neck_cm             NUMERIC(6,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_scan_id ON body_measurements(scan_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. MUSIC INTEGRATION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS music_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(20) NOT NULL DEFAULT 'spotify'
                        CHECK (provider IN ('spotify', 'apple_music', 'youtube_music')),
    provider_user_id    VARCHAR(100),
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    expires_at          TIMESTAMPTZ,
    playlist_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_intensity VARCHAR(20) DEFAULT 'medium'
                        CHECK (preferred_intensity IN ('low', 'medium', 'high', 'extreme')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_music_connections_user_provider ON music_connections(user_id, provider);

CREATE TABLE IF NOT EXISTS music_playlists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id       UUID NOT NULL REFERENCES music_connections(id) ON DELETE CASCADE,
    provider_playlist_id VARCHAR(100) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    intensity           VARCHAR(20) NOT NULL
                        CHECK (intensity IN ('low', 'medium', 'high', 'extreme')),
    workout_type        VARCHAR(50),
    duration_minutes    INTEGER,
    track_count         INTEGER DEFAULT 0,
    image_url           TEXT,
    is_gemz_curated     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_playlists_intensity ON music_playlists(intensity);
CREATE INDEX IF NOT EXISTS idx_music_playlists_connection ON music_playlists(connection_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. GIFT CARDS TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gift_cards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(16) NOT NULL UNIQUE,
    sender_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email     VARCHAR(255) NOT NULL,
    recipient_name      VARCHAR(100),
    recipient_phone     VARCHAR(20),
    message             TEXT,
    gift_type           VARCHAR(20) NOT NULL
                        CHECK (gift_type IN ('balance', 'subscription')),
    amount              NUMERIC(12,2),
    currency            VARCHAR(3) DEFAULT 'USD',
    subscription_plan_id UUID,
    subscription_months INTEGER DEFAULT 1,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    expiry_date         TIMESTAMPTZ NOT NULL,
    redeemed_by         UUID REFERENCES users(id),
    redeemed_at         TIMESTAMPTZ,
    qr_code_url         TEXT,
    design_theme        VARCHAR(30) DEFAULT 'gold',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_sender ON gift_cards(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);

CREATE TABLE IF NOT EXISTS gift_redemptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id        UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    redeemed_by         UUID NOT NULL REFERENCES users(id),
    redeemed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          INET,
    user_agent          TEXT,
    wallet_transaction_id UUID
);

CREATE INDEX IF NOT EXISTS idx_gift_redemptions_card ON gift_redemptions(gift_card_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. NUTRITIONIST CONSULTATION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nutritionists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name           VARCHAR(100) NOT NULL,
    avatar_url          TEXT,
    bio                 TEXT,
    specialties         VARCHAR(50)[] DEFAULT '{}',
    certifications      JSONB DEFAULT '[]',
    years_experience    INTEGER DEFAULT 0,
    languages           VARCHAR(10)[] DEFAULT '{"en"}',
    hourly_rate         NUMERIC(10,2),
    currency            VARCHAR(3) DEFAULT 'USD',
    rating              NUMERIC(3,2) DEFAULT 5.00,
    review_count        INTEGER DEFAULT 0,
    total_sessions      INTEGER DEFAULT 0,
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    availability_schedule JSONB DEFAULT '{}',
    video_call_provider VARCHAR(20) DEFAULT 'jitsi'
                        CHECK (video_call_provider IN ('zoom', 'jitsi', 'google_meet')),
    meeting_link        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutritionists_specialties ON nutritionists USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_nutritionists_verified ON nutritionists(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_nutritionists_available ON nutritionists(is_available) WHERE is_available = TRUE;

CREATE TABLE IF NOT EXISTS nutritionist_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id),
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_minutes    INTEGER NOT NULL DEFAULT 60,
    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes               TEXT,
    client_goals        TEXT,
    meal_plan_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date      TIMESTAMPTZ,
    video_call_url      TEXT,
    recording_url       TEXT,
    rating_given        NUMERIC(3,2),
    client_review       TEXT,
    amount_paid         NUMERIC(10,2),
    currency            VARCHAR(3) DEFAULT 'USD',
    payment_status      VARCHAR(20) DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutritionist_sessions_nutritionist ON nutritionist_sessions(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_sessions_client ON nutritionist_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_sessions_status ON nutritionist_sessions(status);
CREATE INDEX IF NOT EXISTS idx_nutritionist_sessions_scheduled ON nutritionist_sessions(scheduled_at);

-- ═══════════════════════════════════════════════════════════════
-- 5. EMERGENCY SOS TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sos_contacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(255),
    relationship        VARCHAR(30),
    priority            INTEGER NOT NULL DEFAULT 1,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    notify_via_sms      BOOLEAN NOT NULL DEFAULT TRUE,
    notify_via_push     BOOLEAN NOT NULL DEFAULT TRUE,
    notify_via_email    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_contacts_user ON sos_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_contacts_priority ON sos_contacts(priority);

CREATE TABLE IF NOT EXISTS sos_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm')),
    latitude            NUMERIC(10,8) NOT NULL,
    longitude           NUMERIC(11,8) NOT NULL,
    accuracy_meters     NUMERIC(8,2),
    gym_id              UUID REFERENCES gyms(id),
    alert_message       TEXT DEFAULT 'Emergency SOS alert triggered. User needs immediate assistance.',
    contacts_notified   INTEGER NOT NULL DEFAULT 0,
    gyms_notified       INTEGER NOT NULL DEFAULT 0,
    twilio_message_sid  VARCHAR(100),
    resolved_by         UUID REFERENCES users(id),
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sos_alerts_location ON sos_alerts USING GIST(
    ll_to_earth(latitude::float8, longitude::float8)
);

CREATE TABLE IF NOT EXISTS sos_alert_notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id            UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
    contact_id          UUID NOT NULL REFERENCES sos_contacts(id),
    notification_type   VARCHAR(10) NOT NULL
                        CHECK (notification_type IN ('sms', 'push', 'email')),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at             TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alert_notifications_alert ON sos_alert_notifications(alert_id);

COMMIT;
