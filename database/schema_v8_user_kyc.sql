CREATE TABLE IF NOT EXISTS kyc_submissions (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type            VARCHAR(50)     NOT NULL,
    doc_urls            TEXT[]          NOT NULL,
    full_name           VARCHAR(255)    NOT NULL,
    date_of_birth       DATE            NOT NULL,
    id_number           VARCHAR(100)    NOT NULL,
    status              VARCHAR(30)     NOT NULL DEFAULT 'pending',
    reviewer_id         UUID            REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON kyc_submissions(status);
