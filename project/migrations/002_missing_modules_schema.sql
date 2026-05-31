-- ============================================================
-- GEM Z - Global Fitness Operating System v5.0
-- Migration 002: Missing Modules Schema
-- Tables: Social, Creator, Corporate, Ads, Settlement,
--         Compliance, Health, AI
-- PostgreSQL 16
-- ============================================================

-- ============================================================
-- SOCIAL MODULE TABLES
-- ============================================================

-- posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    type VARCHAR(20) DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'PHOTO', 'VIDEO', 'CAROUSEL', 'REEL', 'STORY')),
    visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE', 'COMMUNITY')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED', 'FLAGGED')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- post_media
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT')),
    url TEXT NOT NULL,
    thumbnail TEXT,
    duration INTEGER,
    size INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_likes
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- post_comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES post_comments(id),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- post_shares
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    share_type VARCHAR(20) DEFAULT 'REPOST' CHECK (share_type IN ('REPOST', 'QUOTE', 'STORY_RESHARE', 'MESSAGE')),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_views
CREATE TABLE IF NOT EXISTS post_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewer_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_reports
CREATE TABLE IF NOT EXISTS post_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
    resolved_by UUID REFERENCES users(id),
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- reels
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300),
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER,
    size INTEGER,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ACTIVE', 'REJECTED', 'ARCHIVED', 'DELETED')),
    views_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- reel_views
CREATE TABLE IF NOT EXISTS reel_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    watch_time INTEGER DEFAULT 0,
    viewer_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reel_engagements
CREATE TABLE IF NOT EXISTS reel_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    engagement_type VARCHAR(20) NOT NULL CHECK (engagement_type IN ('LIKE', 'COMMENT', 'SHARE', 'SAVE', 'REPORT')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stories
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'BOOMERANG', 'TEXT')),
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 5,
    background_color VARCHAR(7),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'DELETED', 'ARCHIVED')),
    views_count INTEGER DEFAULT 0,
    reactions_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- story_views
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewer_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- story_reactions
CREATE TABLE IF NOT EXISTS story_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL CHECK (reaction IN ('LIKE', 'LOVE', 'FIRE', 'CLAP', 'WOW')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('DIRECT', 'GROUP')),
    title VARCHAR(200),
    avatar_url TEXT,
    created_by UUID REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender_id UUID REFERENCES users(id),
    unread_count JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    nickname VARCHAR(100),
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reply_to_id UUID REFERENCES messages(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE', 'LOCATION', 'SYSTEM')),
    media_url TEXT,
    media_duration INTEGER,
    media_size INTEGER,
    metadata JSONB DEFAULT '{}',
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- message_status
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SENT', 'DELIVERED', 'SEEN')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- message_reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- communities
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    type VARCHAR(20) DEFAULT 'PUBLIC' CHECK (type IN ('PUBLIC', 'PRIVATE', 'INVITE_ONLY')),
    category VARCHAR(50),
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    rules TEXT,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- community_members
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- community_posts (link table)
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, post_id)
);


-- ============================================================
-- CREATOR MODULE TABLES
-- ============================================================

-- creator_profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_type VARCHAR(50) NOT NULL CHECK (creator_type IN ('TRAINER', 'NUTRITIONIST', 'INFLUENCER', 'FITNESS_CREATOR', 'ATHLETE')),
    display_name VARCHAR(200) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    specialties TEXT[] DEFAULT '{}',
    certifications JSONB DEFAULT '[]',
    social_links JSONB DEFAULT '{}',
    pricing JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    follower_count INTEGER DEFAULT 0,
    subscriber_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(18, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- creator_subscriptions
CREATE TABLE IF NOT EXISTS creator_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
    features JSONB DEFAULT '[]',
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_subscribers (user subscriptions to creators)
CREATE TABLE IF NOT EXISTS creator_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES creator_subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_programs
CREATE TABLE IF NOT EXISTS creator_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('WORKOUT', 'NUTRITION', 'TRANSFORMATION', 'HYBRID')),
    difficulty VARCHAR(20) DEFAULT 'BEGINNER' CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS')),
    duration_weeks INTEGER,
    price DECIMAL(18, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    cover_image TEXT,
    video_intro_url TEXT,
    curriculum JSONB DEFAULT '[]',
    requirements TEXT[] DEFAULT '{}',
    outcomes TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_program_enrollments
CREATE TABLE IF NOT EXISTS creator_program_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES creator_programs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0,
    completed_lessons JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_live_sessions
CREATE TABLE IF NOT EXISTS creator_live_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    cover_image TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_attendees INTEGER,
    ticket_price DECIMAL(18, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    stream_key VARCHAR(255),
    stream_url TEXT,
    recording_url TEXT,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    actual_attendees INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_live_tickets
CREATE TABLE IF NOT EXISTS creator_live_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES creator_live_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    purchase_price DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
    attended BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- session_replays
CREATE TABLE IF NOT EXISTS session_replays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES creator_live_sessions(id) ON DELETE CASCADE,
    recording_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    view_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    available_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_payouts
CREATE TABLE IF NOT EXISTS creator_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    gross_revenue DECIMAL(18, 2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(18, 2) NOT NULL DEFAULT 0,
    processing_fee DECIMAL(18, 2) NOT NULL DEFAULT 0,
    tax_deduction DECIMAL(18, 2) NOT NULL DEFAULT 0,
    net_payout DECIMAL(18, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'DISPUTED')),
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    transaction_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_revenue_splits
CREATE TABLE IF NOT EXISTS creator_revenue_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('SUBSCRIPTION', 'PROGRAM', 'LIVE_SESSION', 'TIP', 'AFFILIATE')),
    source_id UUID,
    gross_amount DECIMAL(18, 2) NOT NULL,
    platform_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    creator_amount DECIMAL(18, 2) NOT NULL,
    platform_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payout_id UUID REFERENCES creator_payouts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- creator_analytics
CREATE TABLE IF NOT EXISTS creator_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    new_subscribers INTEGER DEFAULT 0,
    churned_subscribers INTEGER DEFAULT 0,
    revenue DECIMAL(18, 2) DEFAULT 0,
    engagement_rate DECIMAL(5, 4) DEFAULT 0,
    top_content JSONB DEFAULT '[]',
    audience_demographics JSONB DEFAULT '{}',
    UNIQUE(creator_id, date)
);


-- ============================================================
-- CORPORATE MODULE TABLES
-- ============================================================

-- corporations
CREATE TABLE IF NOT EXISTS corporations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    industry VARCHAR(100),
    size_range VARCHAR(50),
    logo_url TEXT,
    primary_color VARCHAR(7),
    website TEXT,
    country VARCHAR(2) DEFAULT 'EG',
    city VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    billing_email VARCHAR(255),
    billing_contact VARCHAR(200),
    plan_type VARCHAR(50) DEFAULT 'BASIC' CHECK (plan_type IN ('BASIC', 'PRO', 'ENTERPRISE')),
    employee_limit INTEGER,
    monthly_budget DECIMAL(18, 2),
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- corporation_departments
CREATE TABLE IF NOT EXISTS corporation_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporation_id UUID REFERENCES corporations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES corporation_departments(id),
    manager_id UUID REFERENCES users(id),
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- corporation_employees
CREATE TABLE IF NOT EXISTS corporation_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporation_id UUID REFERENCES corporations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES corporation_departments(id),
    employee_code VARCHAR(100),
    job_title VARCHAR(200),
    employment_type VARCHAR(20) DEFAULT 'FULL_TIME' CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    wellness_budget DECIMAL(18, 2),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(corporation_id, user_id)
);

-- hr_managers
CREATE TABLE IF NOT EXISTS hr_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporation_id UUID REFERENCES corporations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    can_manage_departments BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT TRUE,
    can_manage_budget BOOLEAN DEFAULT FALSE,
    can_approve_challenges BOOLEAN DEFAULT TRUE,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(corporation_id, user_id)
);

-- corporate_challenges
CREATE TABLE IF NOT EXISTS corporate_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporation_id UUID REFERENCES corporations(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('STEPS', 'DISTANCE', 'CALORIES', 'WORKOUTS', 'TEAM', 'CUSTOM')),
    goal_metric VARCHAR(50) NOT NULL,
    goal_target INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reward_type VARCHAR(50),
    reward_amount DECIMAL(18, 2),
    reward_currency VARCHAR(3) DEFAULT 'USD',
    max_participants INTEGER,
    team_size INTEGER,
    cover_image TEXT,
    rules TEXT,
    is_public_within_org BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- corporate_challenge_participants
CREATE TABLE IF NOT EXISTS corporate_challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES corporate_challenges(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES corporation_employees(id) ON DELETE CASCADE,
    team_id UUID,
    current_value INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    rank INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reward_earned DECIMAL(18, 2),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- corporate_wellness_scores
CREATE TABLE IF NOT EXISTS corporate_wellness_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES corporation_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_score INTEGER DEFAULT 0 CHECK (activity_score BETWEEN 0 AND 100),
    participation_score INTEGER DEFAULT 0 CHECK (participation_score BETWEEN 0 AND 100),
    attendance_score INTEGER DEFAULT 0 CHECK (attendance_score BETWEEN 0 AND 100),
    consistency_score INTEGER DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
    overall_score INTEGER DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
    breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- ============================================================
-- ADS MODULE TABLES
-- ============================================================

-- ad_campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    description TEXT,
    advertiser_id UUID REFERENCES users(id),
    advertiser_type VARCHAR(50) NOT NULL CHECK (advertiser_type IN ('GYM', 'TRAINER', 'STORE', 'PLATFORM', 'EXTERNAL')),
    objective VARCHAR(50) NOT NULL CHECK (objective IN ('AWARENESS', 'TRAFFIC', 'CONVERSIONS', 'APP_INSTALLS', 'ENGAGEMENT')),
    budget_total DECIMAL(18, 2) NOT NULL,
    budget_daily DECIMAL(18, 2),
    budget_spent DECIMAL(18, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    targeting_countries TEXT[] DEFAULT '{}',
    targeting_cities TEXT[] DEFAULT '{}',
    targeting_genders VARCHAR(10)[] DEFAULT '{M,F}',
    targeting_age_min INTEGER,
    targeting_age_max INTEGER,
    targeting_interests TEXT[] DEFAULT '{}',
    targeting_gym_ids UUID[],
    frequency_cap INTEGER DEFAULT 3,
    landing_url TEXT,
    utm_parameters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ad_creatives
CREATE TABLE IF NOT EXISTS ad_creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(200),
    type VARCHAR(50) NOT NULL CHECK (type IN ('IMAGE', 'VIDEO', 'CAROUSEL', 'SPONSORED_GYM', 'SPONSORED_TRAINER', 'SPONSORED_PRODUCT', 'BANNER', 'NATIVE')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    headline TEXT,
    body TEXT,
    cta_text VARCHAR(100) DEFAULT 'Learn More',
    cta_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    aspect_ratio VARCHAR(10),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ad_slots
CREATE TABLE IF NOT EXISTS ad_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slot_code VARCHAR(100) UNIQUE NOT NULL,
    page_location VARCHAR(100) NOT NULL,
    slot_type VARCHAR(50) NOT NULL CHECK (slot_type IN ('BANNER', 'SIDEBAR', 'FEED', 'INLINE', 'POPUP', 'STICKY')),
    dimensions JSONB NOT NULL,
    is_dynamic BOOLEAN DEFAULT TRUE,
    fallback_content TEXT,
    max_ads INTEGER DEFAULT 1,
    refresh_interval_seconds INTEGER,
    targeting_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ad_impressions
CREATE TABLE IF NOT EXISTS ad_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creative_id UUID REFERENCES ad_creatives(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES ad_slots(id),
    user_id UUID REFERENCES users(id),
    viewer_ip INET,
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    country VARCHAR(2),
    city VARCHAR(100),
    cost_per_impression DECIMAL(18, 6),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ad_clicks
CREATE TABLE IF NOT EXISTS ad_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creative_id UUID REFERENCES ad_creatives(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    impression_id UUID REFERENCES ad_impressions(id),
    user_id UUID REFERENCES users(id),
    click_url TEXT,
    referrer TEXT,
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    country VARCHAR(2),
    cost_per_click DECIMAL(18, 6),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- campaign_analytics
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(18, 2) DEFAULT 0,
    ctr DECIMAL(8, 6) DEFAULT 0,
    cpc DECIMAL(18, 6) DEFAULT 0,
    cpm DECIMAL(18, 6) DEFAULT 0,
    roas DECIMAL(10, 4) DEFAULT 0,
    revenue_attributed DECIMAL(18, 2) DEFAULT 0,
    breakdown_by_device JSONB DEFAULT '{}',
    breakdown_by_country JSONB DEFAULT '{}',
    breakdown_by_hour JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- audience_targets
CREATE TABLE IF NOT EXISTS audience_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(200),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('LOOKALIKE', 'CUSTOM', 'BEHAVIORAL', 'DEMOGRAPHIC', 'INTEREST')),
    source_audience TEXT,
    targeting_criteria JSONB NOT NULL DEFAULT '{}',
    estimated_reach INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SETTLEMENT MODULE TABLES
-- ============================================================

-- settlement_batches
CREATE TABLE IF NOT EXISTS settlement_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('GYM', 'TRAINER', 'STORE', 'CREATOR', 'CORPORATE', 'PLATFORM')),
    total_gross_revenue DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_vat DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_platform_commission DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_fx_fees DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_gateway_fees DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_refunds DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_chargebacks DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_net_payout DECIMAL(18, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    item_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RECONCILED')),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- settlement_items
CREATE TABLE IF NOT EXISTS settlement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES settlement_batches(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('GYM', 'TRAINER', 'STORE', 'CREATOR', 'CORPORATE')),
    entity_name VARCHAR(300),
    payout_method VARCHAR(50),
    payout_account TEXT,
    gross_revenue DECIMAL(18, 2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    platform_commission DECIMAL(18, 2) NOT NULL DEFAULT 0,
    fx_fees DECIMAL(18, 2) NOT NULL DEFAULT 0,
    gateway_fees DECIMAL(18, 2) NOT NULL DEFAULT 0,
    refunds DECIMAL(18, 2) NOT NULL DEFAULT 0,
    chargebacks DECIMAL(18, 2) NOT NULL DEFAULT 0,
    adjustments DECIMAL(18, 2) NOT NULL DEFAULT 0,
    net_payout DECIMAL(18, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'HELD')),
    paid_at TIMESTAMPTZ,
    payment_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payout_requests
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    requester_type VARCHAR(50) NOT NULL CHECK (requester_type IN ('GYM', 'TRAINER', 'STORE', 'CREATOR', 'CORPORATE')),
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payout_method VARCHAR(50) NOT NULL CHECK (payout_method IN ('BANK_TRANSFER', 'WALLET', 'PAYPAL', 'STRIPE', 'WISE')),
    payout_account JSONB NOT NULL DEFAULT '{}',
    settlement_item_id UUID REFERENCES settlement_items(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    transaction_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payout_schedules
CREATE TABLE IF NOT EXISTS payout_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    schedule_type VARCHAR(20) DEFAULT 'WEEKLY' CHECK (schedule_type IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    minimum_amount DECIMAL(18, 2) DEFAULT 50.00,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    payout_method VARCHAR(50),
    payout_account JSONB DEFAULT '{}',
    is_auto_payout BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- withdrawal_requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    withdrawal_method VARCHAR(50) NOT NULL CHECK (withdrawal_method IN ('BANK_TRANSFER', 'INSTANT_CARD', 'PAYPAL', 'CRYPTO', 'CASH_PICKUP')),
    destination_account JSONB NOT NULL DEFAULT '{}',
    fee_amount DECIMAL(18, 2) DEFAULT 0,
    net_amount DECIMAL(18, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    estimated_arrival TIMESTAMPTZ,
    transaction_hash VARCHAR(255),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- treasury_snapshots
CREATE TABLE IF NOT EXISTS treasury_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL UNIQUE,
    total_wallet_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_escrow_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_settlement_pending DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_settlement_paid DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_withdrawal_pending DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_withdrawal_completed DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_platform_revenue DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_fees_earned DECIMAL(18, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    breakdown_by_entity JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reconciliation_logs
CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID REFERENCES treasury_snapshots(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    expected_balance DECIMAL(18, 2) NOT NULL,
    actual_balance DECIMAL(18, 2) NOT NULL,
    difference DECIMAL(18, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'MISMATCH' CHECK (status IN ('MATCHED', 'MISMATCH', 'RESOLVED', 'ESCALATED')),
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPLIANCE MODULE TABLES
-- ============================================================

-- compliance_rules
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('GDPR', 'AML', 'VAT', 'KYC', 'SANCTIONS', 'REGIONAL')),
    jurisdiction VARCHAR(10) DEFAULT 'GLOBAL',
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- compliance_audits
CREATE TABLE IF NOT EXISTS compliance_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES compliance_rules(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('AUTO', 'MANUAL', 'SCHEDULED')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLIANT', 'VIOLATION', 'ESCALATED', 'RESOLVED')),
    findings JSONB DEFAULT '[]',
    severity VARCHAR(20) DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    auditor_id UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- data_retention_policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(200) NOT NULL,
    data_category VARCHAR(100) NOT NULL,
    retention_days INTEGER NOT NULL,
    after_retention_action VARCHAR(50) DEFAULT 'DELETE' CHECK (after_retention_action IN ('DELETE', 'ANONYMIZE', 'ARCHIVE')),
    jurisdiction VARCHAR(10) DEFAULT 'GLOBAL',
    legal_basis TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- deletion_requests (Right to be Forgotten)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) DEFAULT 'FULL' CHECK (request_type IN ('FULL', 'PARTIAL', 'ANONYMIZATION')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'PARTIAL')),
    reason TEXT,
    data_categories TEXT[] DEFAULT '{}',
    verification_method VARCHAR(50),
    verified_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    completion_report JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- vat_records
CREATE TABLE IF NOT EXISTS vat_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    transaction_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    gross_amount DECIMAL(18, 2) NOT NULL,
    vat_rate DECIMAL(5, 4) NOT NULL,
    vat_amount DECIMAL(18, 2) NOT NULL,
    net_amount DECIMAL(18, 2) NOT NULL,
    vat_number VARCHAR(100),
    invoice_number VARCHAR(100),
    tax_jurisdiction VARCHAR(100),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- aml_alerts
CREATE TABLE IF NOT EXISTS aml_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_code VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('LARGE_TRANSACTION', 'VELOCITY', 'STRUCTURING', 'SANCTIONS_MATCH', 'PEP_MATCH', 'SUSPICIOUS_PATTERN')),
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(20) DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    trigger_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'FALSE_POSITIVE', 'ESCALATED', 'RESOLVED')),
    assigned_to UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- HEALTH INTEGRATION MODULE TABLES
-- ============================================================

-- health_connections
CREATE TABLE IF NOT EXISTS health_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('APPLE_HEALTHKIT', 'GOOGLE_HEALTH_CONNECT', 'FITBIT', 'GARMIN', 'SAMSUNG_HEALTH', 'OURA')),
    provider_user_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (sync_status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR', 'PAUSED')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- health_sync_logs
CREATE TABLE IF NOT EXISTS health_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES health_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('INITIAL', 'INCREMENTAL', 'FULL', 'MANUAL')),
    data_types TEXT[] DEFAULT '{}',
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED', 'TIMEOUT')),
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- wearable_data
CREATE TABLE IF NOT EXISTS wearable_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES health_connections(id),
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('STEPS', 'HEART_RATE', 'SLEEP', 'CALORIES', 'ACTIVE_ENERGY', 'WORKOUT', 'BLOOD_OXYGEN', 'STRESS', 'BODY_TEMP', 'BLOOD_PRESSURE')),
    recorded_at TIMESTAMPTZ NOT NULL,
    value DECIMAL(15, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    source_device VARCHAR(100),
    source_app VARCHAR(100),
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    raw_data JSONB DEFAULT '{}',
    is_validated BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- move_to_earn_validations
CREATE TABLE IF NOT EXISTS move_to_earn_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('WALKING', 'RUNNING', 'CYCLING', 'SWIMMING', 'WORKOUT')),
    wearable_data_id UUID REFERENCES wearable_data(id),
    steps INTEGER,
    distance_meters DECIMAL(10, 2),
    calories_burned DECIMAL(10, 2),
    active_minutes INTEGER,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    validation_source VARCHAR(20) NOT NULL DEFAULT 'WEARABLE' CHECK (validation_source IN ('WEARABLE', 'GPS', 'MANUAL', 'HYBRID')),
    validation_score DECIMAL(5, 4) DEFAULT 0 CHECK (validation_score BETWEEN 0 AND 1),
    is_validated BOOLEAN DEFAULT FALSE,
    rewards_earned DECIMAL(18, 4) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'GEM',
    fraud_flags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- activity_rewards
CREATE TABLE IF NOT EXISTS activity_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    validation_id UUID REFERENCES move_to_earn_validations(id),
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('STEPS', 'DISTANCE', 'CALORIES', 'STREAK', 'CHALLENGE', 'BONUS')),
    amount DECIMAL(18, 4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'GEM',
    gem_tokens DECIMAL(18, 6) DEFAULT 0,
    fiat_equivalent DECIMAL(18, 4) DEFAULT 0,
    fiat_currency VARCHAR(3) DEFAULT 'USD',
    source VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI MODULE TABLES
-- ============================================================

-- ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('COACH', 'SUPPORT', 'GENERAL', 'NUTRITION', 'WORKOUT')),
    title VARCHAR(300),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    context JSONB DEFAULT '{}',
    summary TEXT,
    total_tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(18, 6) DEFAULT 0,
    model_used VARCHAR(100) DEFAULT 'gpt-4',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ai_recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('GYM', 'TRAINER', 'PRODUCT', 'CONTENT', 'WORKOUT', 'MEAL', 'PROGRAM')),
    recommended_entity_type VARCHAR(50) NOT NULL,
    recommended_entity_id UUID,
    recommended_entity_name VARCHAR(300),
    confidence_score DECIMAL(5, 4) DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 1),
    reason_summary TEXT,
    detailed_reasoning JSONB DEFAULT '{}',
    user_feedback VARCHAR(20),
    was_clicked BOOLEAN DEFAULT FALSE,
    was_converted BOOLEAN DEFAULT FALSE,
    model_version VARCHAR(50),
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(18, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_predictions
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('CHURN', 'INACTIVITY', 'CANCELLATION', 'UPGRADE', 'ENGAGEMENT_DROP')),
    probability DECIMAL(5, 4) NOT NULL CHECK (probability BETWEEN 0 AND 1),
    risk_level VARCHAR(20) DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    contributing_factors JSONB DEFAULT '[]',
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    triggered_action VARCHAR(100),
    action_result TEXT,
    was_accurate BOOLEAN,
    feedback_score INTEGER,
    model_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_support_tickets
CREATE TABLE IF NOT EXISTS ai_support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ai_conversation_id UUID REFERENCES ai_conversations(id),
    category VARCHAR(100),
    subject TEXT NOT NULL,
    ai_response TEXT,
    ai_confidence DECIMAL(5, 4) DEFAULT 0,
    human_agent_id UUID REFERENCES users(id),
    human_response TEXT,
    status VARCHAR(20) DEFAULT 'AI_HANDLING' CHECK (status IN ('AI_HANDLING', 'ESCALATED', 'HUMAN_REVIEWING', 'RESOLVED', 'CLOSED')),
    resolution_type VARCHAR(20),
    satisfaction_rating INTEGER,
    escalation_reason TEXT,
    tokens_used INTEGER DEFAULT 0,
    ai_cost DECIMAL(18, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ai_cost_records
CREATE TABLE IF NOT EXISTS ai_cost_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('USER', 'GYM', 'COMPANY', 'CREATOR', 'PLATFORM')),
    entity_id UUID NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    prompt_cost DECIMAL(18, 8) DEFAULT 0,
    completion_cost DECIMAL(18, 8) DEFAULT 0,
    total_cost DECIMAL(18, 8) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    request_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_usage_logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_preview TEXT,
    output_preview TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DECIMAL(18, 8) DEFAULT 0,
    latency_ms INTEGER,
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'ERROR', 'TIMEOUT', 'RATE_LIMITED')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES - SOCIAL MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_unique ON post_likes(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_shares_post ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status) WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_reels_user ON reels(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reels_created ON reels(created_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_reel_views_reel ON reel_views(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_user ON reel_views(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_engagements_reel ON reel_engagements(reel_id);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status_msg ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_community_members_comm ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_comm ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_post ON community_posts(post_id);

-- ============================================================
-- INDEXES - CREATOR MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_type ON creator_profiles(creator_type) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verified ON creator_profiles(is_verified) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_creator ON creator_subscriptions(creator_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_creator_subscribers_sub ON creator_subscribers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscribers_user ON creator_subscribers(user_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_creator_subscribers_expires ON creator_subscribers(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_creator_programs_creator ON creator_programs(creator_id) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_creator_programs_type ON creator_programs(type);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON creator_program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_user ON creator_program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_creator ON creator_live_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON creator_live_sessions(scheduled_at) WHERE status IN ('SCHEDULED', 'LIVE');
CREATE INDEX IF NOT EXISTS idx_live_tickets_session ON creator_live_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_user ON creator_live_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_session_replays_session ON session_replays(session_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_revenue_splits_creator ON creator_revenue_splits(creator_id);
CREATE INDEX IF NOT EXISTS idx_revenue_splits_payout ON creator_revenue_splits(payout_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_creator_date ON creator_analytics(creator_id, date);

-- ============================================================
-- INDEXES - CORPORATE MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_corporations_slug ON corporations(slug);
CREATE INDEX IF NOT EXISTS idx_corporations_status ON corporations(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_corp_departments_corp ON corporation_departments(corporation_id);
CREATE INDEX IF NOT EXISTS idx_corp_employees_corp ON corporation_employees(corporation_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_corp_employees_user ON corporation_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_corp_employees_dept ON corporation_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_managers_corp ON hr_managers(corporation_id);
CREATE INDEX IF NOT EXISTS idx_corp_challenges_corp ON corporate_challenges(corporation_id);
CREATE INDEX IF NOT EXISTS idx_corp_challenges_status ON corporate_challenges(status) WHERE status IN ('UPCOMING', 'ACTIVE');
CREATE INDEX IF NOT EXISTS idx_corp_challenge_participants_challenge ON corporate_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_corp_challenge_participants_employee ON corporate_challenge_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_corp_wellness_employee ON corporate_wellness_scores(employee_id, date);

-- ============================================================
-- INDEXES - ADS MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser ON ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_type ON ad_creatives(type);
CREATE INDEX IF NOT EXISTS idx_ad_slots_code ON ad_slots(slot_code);
CREATE INDEX IF NOT EXISTS idx_ad_slots_location ON ad_slots(page_location);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_creative ON ad_impressions(creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_created ON ad_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_creative ON ad_clicks(creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign ON ad_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_audience_targets_campaign ON audience_targets(campaign_id);

-- ============================================================
-- INDEXES - SETTLEMENT MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_settlement_batches_code ON settlement_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status ON settlement_batches(status);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_period ON settlement_batches(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_settlement_items_batch ON settlement_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_entity ON settlement_items(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_settlement_items_status ON settlement_items(status) WHERE status IN ('PENDING', 'APPROVED');
CREATE INDEX IF NOT EXISTS idx_payout_requests_requester ON payout_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status) WHERE status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_payout_schedules_entity ON payout_schedules(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status) WHERE status IN ('PENDING', 'APPROVED', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_treasury_date ON treasury_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_reconciliation_snapshot ON reconciliation_logs(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_entity ON reconciliation_logs(entity_id, entity_type);

-- ============================================================
-- INDEXES - COMPLIANCE MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_compliance_rules_code ON compliance_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_cat ON compliance_rules(category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_rule ON compliance_audits(rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_entity ON compliance_audits(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_status ON compliance_audits(status) WHERE status IN ('PENDING', 'VIOLATION', 'ESCALATED');
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_vat_records_transaction ON vat_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vat_records_country ON vat_records(country_code);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_user ON aml_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status) WHERE status IN ('OPEN', 'UNDER_REVIEW', 'ESCALATED');
CREATE INDEX IF NOT EXISTS idx_aml_alerts_risk ON aml_alerts(risk_level) WHERE status IN ('OPEN', 'UNDER_REVIEW');
CREATE INDEX IF NOT EXISTS idx_data_retention_cat ON data_retention_policies(data_category);

-- ============================================================
-- INDEXES - HEALTH INTEGRATION MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_health_connections_user ON health_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_health_connections_provider ON health_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_health_sync_logs_conn ON health_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_user ON wearable_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_type ON wearable_data(data_type);
CREATE INDEX IF NOT EXISTS idx_wearable_data_recorded ON wearable_data(user_id, data_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_m2e_validations_user ON move_to_earn_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_m2e_validations_activity ON move_to_earn_validations(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_m2e_validations_validated ON move_to_earn_validations(is_validated) WHERE is_validated = TRUE;
CREATE INDEX IF NOT EXISTS idx_activity_rewards_user ON activity_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_rewards_type ON activity_rewards(reward_type);

-- ============================================================
-- INDEXES - AI MODULE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON ai_conversations(session_type) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_user ON ai_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_support_tickets_code ON ai_support_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_ai_support_tickets_user ON ai_support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_support_status ON ai_support_tickets(status) WHERE status IN ('AI_HANDLING', 'ESCALATED', 'HUMAN_REVIEWING');
CREATE INDEX IF NOT EXISTS idx_ai_cost_records_entity ON ai_cost_records(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_records_created ON ai_cost_records(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);

-- ============================================================
-- Migration Complete
-- ============================================================
