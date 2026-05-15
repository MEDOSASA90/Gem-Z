-- GEM Z Database Schema v11 Phase 8a
-- Features: AI Workout Generator, Food Delivery, Corporate Wellness,
--           Group Classes Booking, Home Workout Plans
-- ======================================================================

-- ─── 1. AI WORKOUT GENERATOR ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal            VARCHAR(50) NOT NULL CHECK (goal IN ('lose_weight', 'build_muscle', 'endurance')),
    fitness_level   VARCHAR(20) NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    equipment_available TEXT[] DEFAULT '{}',
    days_per_week   INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_status ON workout_plans(status);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    name            VARCHAR(200) NOT NULL,
    muscle_group    VARCHAR(100) NOT NULL,
    sets            INTEGER NOT NULL DEFAULT 3,
    reps            VARCHAR(50) NOT NULL DEFAULT '10',
    rest_seconds    INTEGER NOT NULL DEFAULT 60,
    duration_minutes INTEGER DEFAULT NULL,
    equipment       VARCHAR(200) DEFAULT 'none',
    instructions    TEXT DEFAULT NULL,
    order_index     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_plan_id ON workout_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day ON workout_exercises(plan_id, day_of_week);

-- ─── 2. FOOD DELIVERY ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS food_restaurants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    cuisine_type    VARCHAR(100) NOT NULL,
    rating          NUMERIC(3,2) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    delivery_time_min INTEGER NOT NULL DEFAULT 30,
    delivery_fee_egp NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_order_egp   NUMERIC(10,2) NOT NULL DEFAULT 0,
    image_url       VARCHAR(500) DEFAULT NULL,
    is_healthy      BOOLEAN NOT NULL DEFAULT true,
    tags            TEXT[] DEFAULT '{}',
    address         TEXT DEFAULT NULL,
    lat             NUMERIC(10,6) DEFAULT NULL,
    lng             NUMERIC(10,6) DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_restaurants_active ON food_restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_food_restaurants_healthy ON food_restaurants(is_healthy);

CREATE TABLE IF NOT EXISTS food_menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES food_restaurants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT DEFAULT NULL,
    price_egp       NUMERIC(10,2) NOT NULL,
    category        VARCHAR(100) NOT NULL DEFAULT 'main',
    calories        INTEGER DEFAULT NULL,
    protein_g       INTEGER DEFAULT NULL,
    carbs_g         INTEGER DEFAULT NULL,
    fats_g          INTEGER DEFAULT NULL,
    image_url       VARCHAR(500) DEFAULT NULL,
    is_available    BOOLEAN NOT NULL DEFAULT true,
    is_healthy      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_menu_restaurant ON food_menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_menu_category ON food_menu_items(category);

CREATE TABLE IF NOT EXISTS food_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id   UUID NOT NULL REFERENCES food_restaurants(id),
    items           JSONB NOT NULL DEFAULT '[]',
    subtotal_egp    NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee_egp NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_egp       NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    delivery_address TEXT NOT NULL DEFAULT '',
    payment_method  VARCHAR(30) NOT NULL DEFAULT 'cash',
    notes           TEXT DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_orders_user ON food_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON food_orders(status);

-- ─── 3. CORPORATE WELLNESS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS corporate_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    industry        VARCHAR(100) DEFAULT NULL,
    size            INTEGER NOT NULL DEFAULT 0,
    admin_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_email   VARCHAR(200) NOT NULL,
    contact_phone   VARCHAR(50) DEFAULT NULL,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
    monthly_cost_egp NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_companies_admin ON corporate_companies(admin_user_id);

CREATE TABLE IF NOT EXISTS corporate_employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES corporate_companies(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    email           VARCHAR(200) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    department      VARCHAR(100) DEFAULT NULL,
    job_title       VARCHAR(100) DEFAULT NULL,
    engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
    workouts_completed INTEGER NOT NULL DEFAULT 0,
    last_active_at  TIMESTAMPTZ DEFAULT NULL,
    assigned_plan_id UUID DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_employees_company ON corporate_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_corporate_employees_user ON corporate_employees(user_id);

-- ─── 4. GROUP CLASSES BOOKING ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    class_type      VARCHAR(50) NOT NULL CHECK (class_type IN ('yoga', 'zumba', 'pilates', 'hiit', 'spinning', 'boxing', 'dance')),
    description     TEXT DEFAULT NULL,
    instructor_name VARCHAR(200) NOT NULL,
    instructor_avatar_url VARCHAR(500) DEFAULT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    max_capacity    INTEGER NOT NULL DEFAULT 20,
    calorie_burn_estimate INTEGER DEFAULT NULL,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    image_url       VARCHAR(500) DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_classes_type ON group_classes(class_type);
CREATE INDEX IF NOT EXISTS idx_group_classes_active ON group_classes(is_active);

CREATE TABLE IF NOT EXISTS class_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        UUID NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            VARCHAR(100) DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_class ON class_schedules(class_id);

CREATE TABLE IF NOT EXISTS class_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES group_classes(id),
    schedule_id     UUID NOT NULL REFERENCES class_schedules(id),
    booking_date    DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled', 'no_show')),
    checked_in_at   TIMESTAMPTZ DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, schedule_id, booking_date)
);

CREATE INDEX IF NOT EXISTS idx_class_bookings_user ON class_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_class ON class_bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_status ON class_bookings(status);

-- ─── 5. HOME WORKOUT PLANS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS home_workouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    description     TEXT DEFAULT NULL,
    difficulty      VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    category        VARCHAR(100) NOT NULL DEFAULT 'full_body',
    calorie_burn_estimate INTEGER DEFAULT NULL,
    image_url       VARCHAR(500) DEFAULT NULL,
    video_url       VARCHAR(500) DEFAULT NULL,
    equipment_needed TEXT[] DEFAULT '{}',
    muscle_groups   TEXT[] DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_workouts_difficulty ON home_workouts(difficulty);
CREATE INDEX IF NOT EXISTS idx_home_workouts_active ON home_workouts(is_active);

CREATE TABLE IF NOT EXISTS home_workout_exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id      UUID NOT NULL REFERENCES home_workouts(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT DEFAULT NULL,
    duration_seconds INTEGER DEFAULT NULL,
    reps            VARCHAR(50) DEFAULT NULL,
    sets            INTEGER DEFAULT NULL,
    rest_seconds    INTEGER DEFAULT 30,
    order_index     INTEGER NOT NULL DEFAULT 0,
    image_url       VARCHAR(500) DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_workout_exercises_workout ON home_workout_exercises(workout_id);

CREATE TABLE IF NOT EXISTS home_workout_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id      UUID NOT NULL REFERENCES home_workouts(id),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ DEFAULT NULL,
    duration_seconds INTEGER DEFAULT NULL,
    calories_burned INTEGER DEFAULT NULL,
    exercises_completed INTEGER DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_workout_sessions_user ON home_workout_sessions(user_id);

-- ─── SEED DATA ───────────────────────────────────────────────────────

-- Seed: Group Classes
INSERT INTO group_classes (id, name, class_type, description, instructor_name, duration_minutes, max_capacity, calorie_burn_estimate, difficulty, image_url)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Morning Flow Yoga', 'yoga', 'Start your day with energizing sun salutations and breathing exercises.', 'Sarah Chen', 60, 20, 250, 'beginner', '/images/classes/yoga.jpg'),
    ('a2222222-2222-2222-2222-222222222222', 'Power Vinyasa Yoga', 'yoga', 'Dynamic flowing sequences to build strength and flexibility.', 'Maya Rodriguez', 75, 15, 400, 'intermediate', '/images/classes/yoga-power.jpg'),
    ('a3333333-3333-3333-3333-333333333333', 'Zumba Fitness', 'zumba', 'Dance your way to fitness with Latin-inspired moves.', 'Carlos Mendez', 60, 25, 500, 'beginner', '/images/classes/zumba.jpg'),
    ('a4444444-4444-4444-4444-444444444444', 'Zumba Toning', 'zumba', 'Add resistance training to your Zumba routine with light weights.', 'Lisa Park', 60, 20, 550, 'intermediate', '/images/classes/zumba-toning.jpg'),
    ('a5555555-5555-5555-5555-555555555555', 'Mat Pilates', 'pilates', 'Core strengthening exercises focusing on posture and alignment.', 'Emma Wilson', 60, 18, 300, 'beginner', '/images/classes/pilates.jpg'),
    ('a6666666-6666-6666-6666-666666666666', 'Reformer Pilates', 'pilates', 'Advanced Pilates using reformer machines for resistance.', 'James Taylor', 60, 10, 450, 'advanced', '/images/classes/pilates-reformer.jpg'),
    ('a7777777-7777-7777-7777-777777777777', 'HIIT Blast', 'hiit', 'High-intensity interval training for maximum calorie burn.', 'Alex Johnson', 45, 20, 600, 'intermediate', '/images/classes/hiit.jpg'),
    ('a8888888-8888-8888-8888-888888888888', 'HIIT Extreme', 'hiit', 'Advanced HIIT with plyometrics and heavy compound movements.', 'Mike Brown', 45, 15, 750, 'advanced', '/images/classes/hiit-extreme.jpg')
ON CONFLICT DO NOTHING;

-- Seed: Class Schedules
INSERT INTO class_schedules (id, class_id, day_of_week, start_time, end_time, room)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, '07:00:00', '08:00:00', 'Studio A'),
    ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 3, '07:00:00', '08:00:00', 'Studio A'),
    ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 5, '07:00:00', '08:00:00', 'Studio A'),
    ('b4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 2, '18:00:00', '19:15:00', 'Studio A'),
    ('b5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', 1, '18:00:00', '19:00:00', 'Studio B'),
    ('b6666666-6666-6666-6666-666666666666', 'a3333333-3333-3333-3333-333333333333', 3, '18:00:00', '19:00:00', 'Studio B'),
    ('b7777777-7777-7777-7777-777777777777', 'a4444444-4444-4444-4444-444444444444', 4, '19:00:00', '20:00:00', 'Studio B'),
    ('b8888888-8888-8888-8888-888888888888', 'a5555555-5555-5555-5555-555555555555', 2, '08:00:00', '09:00:00', 'Studio C'),
    ('b9999999-9999-9999-9999-999999999999', 'a6666666-6666-6666-6666-666666666666', 4, '17:00:00', '18:00:00', 'Studio C'),
    ('ba000000-0000-0000-0000-000000000000', 'a7777777-7777-7777-7777-777777777777', 0, '07:00:00', '07:45:00', 'Studio D'),
    ('ba111111-1111-1111-1111-111111111111', 'a7777777-7777-7777-7777-777777777777', 2, '07:00:00', '07:45:00', 'Studio D'),
    ('ba222222-2222-2222-2222-222222222222', 'a8888888-8888-8888-8888-888888888888', 5, '18:00:00', '18:45:00', 'Studio D')
ON CONFLICT DO NOTHING;

-- Seed: Home Workouts
INSERT INTO home_workouts (id, title, description, difficulty, duration_minutes, category, calorie_burn_estimate, image_url, equipment_needed, muscle_groups)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Beginner Full Body', 'A gentle full-body workout perfect for beginners. No equipment needed.', 'beginner', 15, 'full_body', 100, '/images/home/beginner-fullbody.jpg', '{}', '{"full_body"}'),
    ('c2222222-2222-2222-2222-222222222222', 'Morning Energizer', 'Quick morning routine to wake up your body and mind.', 'beginner', 10, 'full_body', 80, '/images/home/morning-energizer.jpg', '{}', '{"full_body"}'),
    ('c3333333-3333-3333-3333-333333333333', 'Core Fundamentals', 'Build a strong core foundation with basic exercises.', 'beginner', 12, 'core', 90, '/images/home/core-fundamentals.jpg', '{}', '{"core"}'),
    ('c4444444-4444-4444-4444-444444444444', 'Intermediate HIIT', 'High-intensity intervals to boost metabolism and burn fat.', 'intermediate', 20, 'cardio', 250, '/images/home/intermediate-hiit.jpg', '{}', '{"cardio","legs"}'),
    ('c5555555-5555-5555-5555-555555555555', 'Upper Body Strength', 'Push-up and pull-up variations for upper body strength.', 'intermediate', 18, 'upper_body', 200, '/images/home/upper-body.jpg', '{"pull-up_bar"}', '{"chest","back","arms"}'),
    ('c6666666-6666-6666-6666-666666666666', 'Lower Body Power', 'Squat and lunge variations to build leg strength.', 'intermediate', 20, 'lower_body', 220, '/images/home/lower-body.jpg', '{}', '{"legs","glutes"}'),
    ('c7777777-7777-7777-7777-777777777777', 'Advanced Calisthenics', 'Master-level bodyweight movements including muscle-ups.', 'advanced', 30, 'full_body', 350, '/images/home/advanced-calisthenics.jpg', '{"pull-up_bar","parallettes"}', '{"full_body"}'),
    ('c8888888-8888-8888-8888-888888888888', 'Extreme Cardio Burn', 'Maximum intensity cardio workout with plyometric movements.', 'advanced', 25, 'cardio', 400, '/images/home/extreme-cardio.jpg', '{}', '{"cardio","legs","core"}')
ON CONFLICT DO NOTHING;

-- Seed: Home Workout Exercises
INSERT INTO home_workout_exercises (id, workout_id, name, description, duration_seconds, reps, sets, rest_seconds, order_index)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Jumping Jacks', 'Classic cardio warm-up exercise', 45, NULL, NULL, 15, 0),
    ('d2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Bodyweight Squats', 'Stand with feet shoulder-width apart, lower hips back and down', NULL, '10', 2, 30, 1),
    ('d3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Push-ups (Knee)', 'Modified push-ups on your knees for beginners', NULL, '8', 2, 30, 2),
    ('d4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Plank Hold', 'Hold plank position on forearms', 30, NULL, NULL, 15, 3),
    ('d5555555-5555-5555-5555-555555555555', 'c4444444-4444-4444-4444-444444444444', 'Burpees', 'Full burpee with push-up and jump', NULL, '15', 4, 30, 0),
    ('d6666666-6666-6666-6666-666666666666', 'c4444444-4444-4444-4444-444444444444', 'Mountain Climbers', 'High-knee drive in plank position', 40, NULL, 4, 20, 1),
    ('d7777777-7777-7777-7777-777777777777', 'c4444444-4444-4444-4444-444444444444', 'Jump Squats', 'Explosive squat jumps', NULL, '12', 4, 30, 2),
    ('d8888888-8888-8888-8888-888888888888', 'c4444444-4444-4444-4444-444444444444', 'High Knees', 'Run in place bringing knees to chest level', 30, NULL, 4, 20, 3)
ON CONFLICT DO NOTHING;

-- Seed: Food Restaurants
INSERT INTO food_restaurants (id, name, cuisine_type, rating, delivery_time_min, delivery_fee_egp, min_order_egp, is_healthy, tags, address)
VALUES
    ('e1111111-1111-1111-1111-111111111111', 'Green Bowl', 'Healthy Salads', 4.8, 25, 15, 50, true, '{"salads","vegan","organic"}', '123 Health St, Zamalek'),
    ('e2222222-2222-2222-2222-222222222222', 'Protein House', 'High-Protein Meals', 4.6, 30, 20, 75, true, '{"protein","meal-prep","keto"}', '45 Fitness Ave, Maadi'),
    ('e3333333-3333-3333-3333-333333333333', 'Mediterranean Fresh', 'Mediterranean', 4.7, 20, 10, 60, true, '{"mediterranean","fresh","organic"}', '78 Nile Corniche, Downtown'),
    ('e4444444-4444-4444-4444-444444444444', 'Lean & Clean', 'Low-Calorie Meals', 4.5, 35, 15, 80, true, '{"low-cal","weight-loss","balanced"}', '12 Garden City, Zamalek')
ON CONFLICT DO NOTHING;

-- Seed: Food Menu Items
INSERT INTO food_menu_items (id, restaurant_id, name, description, price_egp, category, calories, protein_g, carbs_g, fats_g, is_healthy)
VALUES
    ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Quinoa Super Bowl', 'Quinoa with roasted vegetables, avocado, and tahini dressing', 120, 'bowls', 450, 18, 52, 22, true),
    ('f2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'Grilled Chicken Salad', 'Mixed greens with grilled chicken breast and lemon vinaigrette', 150, 'salads', 380, 35, 12, 18, true),
    ('f3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', 'Steak & Rice Bowl', 'Grilled lean steak with brown rice and steamed broccoli', 220, 'bowls', 580, 42, 48, 24, true),
    ('f4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', 'Protein Smoothie', 'Whey protein shake with banana and peanut butter', 85, 'drinks', 320, 30, 28, 12, true),
    ('f5555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', 'Grilled Salmon Plate', 'Mediterranean-style grilled salmon with olive oil and herbs', 280, 'mains', 520, 38, 8, 35, true),
    ('f6666666-6666-6666-6666-666666666666', 'e3333333-3333-3333-3333-333333333333', 'Hummus & Veggie Wrap', 'Whole wheat wrap with hummus and fresh vegetables', 95, 'wraps', 340, 12, 45, 14, true)
ON CONFLICT DO NOTHING;

-- ─── TRIGGER: updated_at ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_workout_plans_updated_at BEFORE UPDATE ON workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_food_orders_updated_at BEFORE UPDATE ON food_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_corporate_companies_updated_at BEFORE UPDATE ON corporate_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_corporate_employees_updated_at BEFORE UPDATE ON corporate_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_class_bookings_updated_at BEFORE UPDATE ON class_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
