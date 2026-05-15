-- ═══════════════════════════════════════════════════════════════
-- GEM Z Phase 8c: Loyalty, Affiliate, Progress, Marketplace, Kids
-- schema_v11_phase8c.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── 11. Loyalty Program ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    min_points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    free_passes_per_month INTEGER DEFAULT 0,
    priority_booking BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#CD7F32',
    icon VARCHAR(50) DEFAULT 'shield',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'merchandise', -- discount, free_pass, merchandise, priority, experience
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- checkin, purchase, referral, challenge, redemption, bonus
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(type);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
    points_used INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'completed', -- completed, cancelled, refunded
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user ON loyalty_redemptions(user_id);

-- ─── 12. Affiliate Program ────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referral_link TEXT NOT NULL,
    commission_rate_subscription DECIMAL(5,4) DEFAULT 0.1000,
    commission_rate_store DECIMAL(5,4) DEFAULT 0.0500,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- pending, active, suspended
    payout_method VARCHAR(20), -- bank_transfer, instapay
    payout_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    converted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    click_id UUID REFERENCES affiliate_clicks(id),
    order_id VARCHAR(100) NOT NULL,
    order_type VARCHAR(20) NOT NULL, -- subscription, store
    order_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    commission_earned DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate ON affiliate_conversions(affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL, -- bank_transfer, instapay
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    reference VARCHAR(200),
    notes TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON affiliate_payouts(affiliate_id);

-- ─── 13. Progress Photos AI ───────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    photo_type VARCHAR(20) DEFAULT 'front', -- front, back, side, custom
    angle VARCHAR(50),
    weight_at_photo DECIMAL(6,2),
    body_fat_at_photo DECIMAL(5,2),
    muscle_mass_at_photo DECIMAL(5,2),
    notes TEXT,
    tags TEXT[],
    ai_analysis_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON progress_photos(photo_type);

CREATE TABLE IF NOT EXISTS progress_ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES progress_photos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_fat_estimate DECIMAL(5,2),
    muscle_mass_estimate DECIMAL(5,2),
    posture_score DECIMAL(5,2),
    symmetry_score DECIMAL(5,2),
    body_composition JSONB,
    landmarks JSONB,
    recommendations JSONB,
    confidence_score DECIMAL(4,3),
    model_version VARCHAR(20) DEFAULT 'gemz-v1.0',
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_ai_photo ON progress_ai_analysis(photo_id);

-- ─── 14. Gym Equipment Marketplace ────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- weights, machines, accessories, supplements
    condition VARCHAR(20) NOT NULL, -- new, like_new, good, fair, used
    price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EGP',
    images TEXT[],
    location VARCHAR(200),
    brand VARCHAR(100),
    model VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    negotiable BOOLEAN DEFAULT FALSE,
    shipping_available BOOLEAN DEFAULT FALSE,
    shipping_cost DECIMAL(12,2),
    featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, sold, reserved, deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id);

CREATE TABLE IF NOT EXISTS marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    listing_title VARCHAR(200),
    seller_id UUID NOT NULL REFERENCES users(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    delivery_address JSONB,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON marketplace_orders(seller_id);

-- ─── 15. Kid Fitness ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kids_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    age_group VARCHAR(10) NOT NULL, -- 6-12, 13-17
    difficulty VARCHAR(20) NOT NULL, -- easy, medium, hard
    duration_minutes INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]',
    mascot VARCHAR(50) DEFAULT 'leo_lion',
    mascot_message TEXT,
    category VARCHAR(50) DEFAULT 'adventure', -- adventure, dance, strength, hiit, sports
    points_reward INTEGER DEFAULT 50,
    badge_reward VARCHAR(100),
    badge_color VARCHAR(7),
    image_url TEXT,
    video_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kids_workouts_age ON kids_workouts(age_group);

CREATE TABLE IF NOT EXISTS kids_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    age_group VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL, -- daily, weekly, streak
    goal INTEGER NOT NULL,
    goal_unit VARCHAR(50) NOT NULL,
    points_reward INTEGER DEFAULT 100,
    badge_name VARCHAR(100),
    badge_icon VARCHAR(50),
    badge_color VARCHAR(7),
    mascot VARCHAR(50) DEFAULT 'leo_lion',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    participants_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kids_challenges_age ON kids_challenges(age_group);

CREATE TABLE IF NOT EXISTS kids_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES kids_workouts(id),
    challenge_id UUID REFERENCES kids_challenges(id),
    activity_type VARCHAR(50) NOT NULL, -- workout, challenge, bonus
    points_earned INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kids_activity_user ON kids_activity_logs(user_id);

CREATE TABLE IF NOT EXISTS kids_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_name VARCHAR(100) NOT NULL,
    badge_icon VARCHAR(50) DEFAULT 'emoji_events',
    badge_color VARCHAR(7) DEFAULT '#FFD700',
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_name)
);

CREATE INDEX IF NOT EXISTS idx_kids_badges_user ON kids_badges(user_id);

CREATE TABLE IF NOT EXISTS parent_child_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
);
