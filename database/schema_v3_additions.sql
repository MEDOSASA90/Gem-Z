-- Phase 6 DB Additions

ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '+20';
ALTER TABLE trainee_profiles ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(50);
ALTER TABLE trainee_profiles ADD COLUMN IF NOT EXISTS id_front_url TEXT;
ALTER TABLE trainee_profiles ADD COLUMN IF NOT EXISTS id_back_url TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS location_url TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS amenities TEXT[];
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS female_hours VARCHAR(255);

CREATE TABLE IF NOT EXISTS gym_visits (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    check_in_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time  TIMESTAMPTZ,
    duration_minutes INTEGER
);

CREATE INDEX IF NOT EXISTS idx_gym_visits_user ON gym_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_visits_gym ON gym_visits(gym_id, check_in_time DESC);
