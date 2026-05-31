-- ============================================================
-- GEM Z - Global Fitness Operating System v5.0
-- Initial Database Migration
-- PostgreSQL 16
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS & IDENTITY
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    country VARCHAR(2) NOT NULL DEFAULT 'EG',
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'PENDING',
    kyc_level INTEGER DEFAULT 0,
    fraud_score INTEGER DEFAULT 0,
    trusted_devices JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR(100) UNIQUE NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role-Permissions junction
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User-Roles junction
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    scope_regions TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    geo_country VARCHAR(2),
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    mfa_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYC Submissions
CREATE TABLE IF NOT EXISTS kyc_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    documents JSONB DEFAULT '[]',
    ocr_data JSONB DEFAULT '{}',
    face_match_score DECIMAL(5,2),
    liveness_score DECIMAL(5,2),
    fraud_score INTEGER DEFAULT 0,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ECONOMY - WALLETS
-- ============================================================

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(18,4) NOT NULL DEFAULT 0,
    held_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    type VARCHAR(20) DEFAULT 'CONSUMER',
    snapshot_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    balance_after DECIMAL(18,4),
    status VARCHAR(20) DEFAULT 'PENDING',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Entries (Partitioned by month)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account VARCHAR(100) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for ledger_entries
CREATE TABLE IF NOT EXISTS ledger_entries_2024_01 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_02 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_03 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_04 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_05 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_06 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_07 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_08 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_09 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_10 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_11 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS ledger_entries_2024_12 PARTITION OF ledger_entries
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS ledger_entries_default PARTITION OF ledger_entries DEFAULT;

-- FX Rates
CREATE TABLE IF NOT EXISTS fx_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18,8) NOT NULL,
    spread DECIMAL(18,8) NOT NULL DEFAULT 0,
    effective_rate DECIMAL(18,8) NOT NULL,
    source VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrows
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    order_id UUID,
    seller_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'HELD',
    hold_reason TEXT,
    release_conditions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ
);

-- GEM Points
CREATE TABLE IF NOT EXISTS gem_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    snapshot_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points Transactions
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    description TEXT,
    reference_id UUID,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cashback Rules
CREATE TABLE IF NOT EXISTS cashback_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    percentage DECIMAL(5,2) NOT NULL,
    min_amount DECIMAL(12,2) DEFAULT 0,
    max_cashback DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. FITNESS
-- ============================================================

-- Gyms
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    kyc_status VARCHAR(20) DEFAULT 'PENDING',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Gym Branches
CREATE TABLE IF NOT EXISTS gym_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    location_lat DECIMAL(10,8),
    location_lon DECIMAL(11,8),
    facilities TEXT[] DEFAULT '{}',
    operating_hours JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership Plans
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    branch_ids UUID[] DEFAULT '{}',
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_months INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    max_members INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id),
    branch_id UUID REFERENCES gym_branches(id),
    plan_id UUID REFERENCES membership_plans(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Slots
CREATE TABLE IF NOT EXISTS class_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id),
    branch_id UUID REFERENCES gym_branches(id),
    trainer_id UUID REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    max_capacity INTEGER NOT NULL DEFAULT 20,
    booked_count INTEGER NOT NULL DEFAULT 0,
    waitlist_count INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    room VARCHAR(100),
    equipment_needed TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    recurrence_rule VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES class_slots(id),
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    check_in_time TIMESTAMPTZ,
    check_in_method VARCHAR(20),
    cancellation_reason TEXT,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist Entries
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES class_slots(id),
    position INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    gym_id UUID REFERENCES gyms(id),
    branch_id UUID REFERENCES gym_branches(id),
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    method VARCHAR(20) NOT NULL,
    qr_code VARCHAR(255),
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Plans
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meals JSONB DEFAULT '[]',
    calories_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    dietary_restrictions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MARKETPLACE
-- ============================================================

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES product_categories(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id),
    store_id UUID,
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(300) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    compare_at_price DECIMAL(12,2),
    cost_per_item DECIMAL(12,2),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    track_quantity BOOLEAN DEFAULT TRUE,
    quantity INTEGER DEFAULT 0,
    weight DECIMAL(10,2),
    images TEXT[] DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'DRAFT',
    seo_title VARCHAR(200),
    seo_description TEXT,
    tags TEXT[] DEFAULT '{}',
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(slug)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    store_id UUID,
    status VARCHAR(20) DEFAULT 'CREATED',
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    fulfillment_status VARCHAR(20) DEFAULT 'PENDING',
    currency VARCHAR(3) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(300) NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================
-- 5. ENTERPRISE
-- ============================================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id),
    role_id UUID REFERENCES roles(id),
    permission_scopes TEXT[] DEFAULT '{}',
    region_scopes TEXT[] DEFAULT '{}',
    mfa_required BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    hired_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (Partitioned by month)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions for audit_logs
CREATE TABLE IF NOT EXISTS audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS audit_logs_2024_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;

-- ============================================================
-- 6. INDEXES
-- ============================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_kyc ON users(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_fraud ON users(fraud_score) WHERE fraud_score > 50;

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Roles & Permissions indexes
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- KYC indexes
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_type ON kyc_submissions(type);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Ledger indexes
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at);

-- FX indexes
CREATE INDEX IF NOT EXISTS idx_fx_pair ON fx_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_expires ON fx_rates(expires_at);

-- Escrow indexes
CREATE INDEX IF NOT EXISTS idx_escrow_wallet ON escrows(wallet_id);
CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrows(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrows(status);

-- Points indexes
CREATE INDEX IF NOT EXISTS idx_points_user ON gem_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_source ON points_transactions(source);

-- Gym indexes
CREATE INDEX IF NOT EXISTS idx_gyms_owner ON gyms(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status) WHERE deleted_at IS NULL;

-- Branch indexes
CREATE INDEX IF NOT EXISTS idx_branches_gym ON gym_branches(gym_id);
CREATE INDEX IF NOT EXISTS idx_branches_location ON gym_branches(location_lat, location_lon);
CREATE INDEX IF NOT EXISTS idx_branches_city ON gym_branches(city, country);

-- Membership indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_gym ON memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships(start_date, end_date);

-- Slot & Booking indexes
CREATE INDEX IF NOT EXISTS idx_slots_gym ON class_slots(gym_id);
CREATE INDEX IF NOT EXISTS idx_slots_branch ON class_slots(branch_id);
CREATE INDEX IF NOT EXISTS idx_slots_time ON class_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON class_slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON waitlist_entries(slot_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON waitlist_entries(user_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym ON attendance_records(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance_records(entry_time);

-- Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Enterprise indexes
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_risk ON audit_logs(risk_score) WHERE risk_score > 50;

-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- Seed default roles
INSERT INTO roles (name, slug, description, level, is_system) VALUES
('Super Admin', 'super_admin', 'Full system access', 100, TRUE),
('Finance Officer', 'finance_officer', 'Financial operations and reconciliation', 80, TRUE),
('KYC Reviewer', 'kyc_reviewer', 'Identity verification reviewer', 60, TRUE),
('Moderator', 'moderator', 'Content moderation', 50, TRUE),
('Support Agent', 'support_agent', 'Customer support', 40, TRUE),
('Regional Manager', 'regional_manager', 'Regional operations manager', 70, TRUE),
('Operations Engineer', 'operations_engineer', 'System operations and monitoring', 60, TRUE),
('Fraud Analyst', 'fraud_analyst', 'Fraud detection and investigation', 75, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Seed default permissions
INSERT INTO permissions (scope, action, resource, description, category) VALUES
-- Finance
('wallet:read', 'read', 'wallet', 'View wallet details', 'finance'),
('wallet:reconcile', 'reconcile', 'wallet', 'Reconcile wallet transactions', 'finance'),
('payout:approve', 'approve', 'payout', 'Approve payouts', 'finance'),
('refund:approve', 'approve', 'refund', 'Approve refunds', 'finance'),
('transaction:read', 'read', 'transaction', 'View transactions', 'finance'),
('fx:manage', 'manage', 'fx', 'Manage FX rates', 'finance'),
-- KYC
('kyc:review', 'review', 'kyc', 'Review KYC submissions', 'kyc'),
('kyc:escalate', 'escalate', 'kyc', 'Escalate KYC cases', 'kyc'),
('kyc:override', 'override', 'kyc', 'Override KYC decisions', 'kyc'),
-- Operations
('gym:approve', 'approve', 'gym', 'Approve gym registrations', 'operations'),
('gym:manage', 'manage', 'gym', 'Manage gyms', 'operations'),
('store:approve', 'approve', 'store', 'Approve store registrations', 'operations'),
('store:manage', 'manage', 'store', 'Manage stores', 'operations'),
('logistics:manage', 'manage', 'logistics', 'Manage logistics', 'operations'),
('booking:manage', 'manage', 'booking', 'Manage bookings', 'operations'),
-- Security
('fraud:investigate', 'investigate', 'fraud', 'Investigate fraud cases', 'security'),
('fraud:manage', 'manage', 'fraud', 'Manage fraud rules', 'security'),
('device:block', 'block', 'device', 'Block devices', 'security'),
('device:manage', 'manage', 'device', 'Manage devices', 'security'),
('user:suspend', 'suspend', 'user', 'Suspend users', 'security'),
('user:manage', 'manage', 'user', 'Manage users', 'security'),
-- Content
('reels:moderate', 'moderate', 'reels', 'Moderate reels', 'content'),
('creator:suspend', 'suspend', 'creator', 'Suspend creators', 'content'),
('creator:manage', 'manage', 'creator', 'Manage creators', 'content'),
('ads:approve', 'approve', 'ads', 'Approve advertisements', 'content'),
('ads:manage', 'manage', 'ads', 'Manage ads', 'content'),
-- Admin
('admin:dashboard', 'read', 'dashboard', 'View admin dashboard', 'admin'),
('admin:settings', 'manage', 'settings', 'Manage system settings', 'admin'),
('admin:audit', 'read', 'audit', 'View audit logs', 'admin'),
('admin:reports', 'read', 'reports', 'View reports', 'admin'),
('role:manage', 'manage', 'role', 'Manage roles and permissions', 'admin')
ON CONFLICT (scope) DO NOTHING;

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'super_admin'
ON CONFLICT DO NOTHING;

-- Seed departments
INSERT INTO departments (name, description) VALUES
('Finance', 'Financial operations and accounting'),
('KYC', 'Know Your Customer operations'),
('Operations', 'Day-to-day platform operations'),
('Security', 'Security and fraud prevention'),
('Content', 'Content moderation and management'),
('Technology', 'Software development and infrastructure'),
('Human Resources', 'HR and employee management'),
('Legal', 'Legal compliance and contracts')
ON CONFLICT DO NOTHING;

-- Seed default FX rates
INSERT INTO fx_rates (from_currency, to_currency, rate, spread, effective_rate, source, expires_at) VALUES
('USD', 'EGP', 50.50000000, 0.00500000, 50.25250000, 'central_bank', NOW() + INTERVAL '24 hours'),
('USD', 'SAR', 3.75000000, 0.00100000, 3.74625000, 'central_bank', NOW() + INTERVAL '24 hours'),
('USD', 'EUR', 0.92000000, 0.00200000, 0.91816000, 'ecb', NOW() + INTERVAL '24 hours'),
('SAR', 'EGP', 13.47000000, 0.00500000, 13.40300000, 'central_bank', NOW() + INTERVAL '24 hours'),
('EUR', 'EGP', 54.89000000, 0.00500000, 54.61600000, 'ecb', NOW() + INTERVAL '24 hours'),
('SAR', 'EUR', 0.24500000, 0.00200000, 0.24451000, 'ecb', NOW() + INTERVAL '24 hours')
ON CONFLICT DO NOTHING;

-- Seed cashback rules
INSERT INTO cashback_rules (name, category, percentage, min_amount, max_cashback, is_active) VALUES
('General Cashback', 'general', 1.00, 0.00, 100.00, TRUE),
('Fitness Products', 'fitness', 2.50, 10.00, 200.00, TRUE),
('Nutrition', 'nutrition', 3.00, 5.00, 150.00, TRUE),
('Membership Bonus', 'membership', 5.00, 50.00, 500.00, TRUE),
('First Purchase', 'first_purchase', 10.00, 0.00, 100.00, TRUE)
ON CONFLICT DO NOTHING;

-- Seed product categories
INSERT INTO product_categories (name, slug, description, sort_order, is_active) VALUES
('Supplements', 'supplements', 'Fitness supplements and nutrition', 1, TRUE),
('Equipment', 'equipment', 'Gym equipment and accessories', 2, TRUE),
('Apparel', 'apparel', 'Fitness clothing and wearables', 3, TRUE),
('Digital Plans', 'digital-plans', 'Workout and nutrition plans', 4, TRUE),
('Services', 'services', 'Personal training and consultations', 5, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Migration complete
-- ============================================================
