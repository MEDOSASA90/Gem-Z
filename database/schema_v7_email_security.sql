-- ============================================================
--  GEM Z — Schema v7: Email Verification & Token Security
--  Features: Email OTP, Password Reset, Refresh Token Blacklist
-- ============================================================

-- ============================================================
-- STEP 1: Email Verification Tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user  ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verify_exp   ON email_verification_tokens(expires_at) WHERE used_at IS NULL;

-- ============================================================
-- STEP 2: Password Reset Tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    used_at         TIMESTAMPTZ,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_exp   ON password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- ============================================================
-- STEP 3: Refresh Token Blacklist (for secure logout)
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
    id              BIGSERIAL   PRIMARY KEY,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,  -- SHA256 hash of the token
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blacklisted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL           -- same as token's original expiry
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash    ON refresh_token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON refresh_token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user    ON refresh_token_blacklist(user_id);

-- ============================================================
-- STEP 4: Cleanup function (run via pg_cron or scheduler)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count    INTEGER;
BEGIN
    DELETE FROM email_verification_tokens WHERE expires_at < NOW() AND used_at IS NULL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used_at IS NULL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    DELETE FROM refresh_token_blacklist WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    RETURN deleted_count;
END;
$$;

-- ============================================================
-- END OF SCHEMA v7
-- ============================================================
