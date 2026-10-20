-- =============================================================================
-- ExamTyper initial schema.
-- All timestamps are stored as TIMESTAMPTZ (UTC). Money is stored in paise (INTEGER)
-- to avoid floating point drift. Sequences are created explicitly so that
-- Hibernate's validate mode can check them.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_user_id           START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_exam_profile_id   START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_passage_id        START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_mock_test_id      START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_attempt_id        START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_event_id          START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_mock_test_passage_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_plan_id           START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_coupon_id         START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_redemption_id     START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_order_id          START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_payment_id        START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_subscription_id  START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_invoice_id        START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_certificate_id   START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_drill_id          START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_waitlist_id       START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_audit_id          START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_refresh_token_id  START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_password_reset_id START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                       BIGINT PRIMARY KEY DEFAULT nextval('seq_user_id'),
    email                    VARCHAR(190) NOT NULL,
    password_hash            VARCHAR(120) NOT NULL,
    display_name             VARCHAR(80)  NOT NULL,
    role                     VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status                   VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    email_verified           BOOLEAN      NOT NULL DEFAULT FALSE,
    preferred_exam_code      VARCHAR(60),
    preferred_language       VARCHAR(20),
    target_wpm               INTEGER,
    leaderboard_opt_out      BOOLEAN      NOT NULL DEFAULT FALSE,
    show_email_on_leaderboard BOOLEAN      NOT NULL DEFAULT FALSE,
    daily_free_limit         INTEGER      NOT NULL DEFAULT 3,
    timezone                 VARCHAR(60)  NOT NULL DEFAULT 'Asia/Kolkata',
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at            TIMESTAMPTZ,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('USER','ADMIN')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE','DISABLED'))
);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
CREATE INDEX idx_users_role ON users (role);

-- -----------------------------------------------------------------------------
-- refresh tokens (hashed at rest; supports rotation + revocation)
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id          BIGINT PRIMARY KEY DEFAULT nextval('seq_refresh_token_id'),
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(120) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMPTZ,
    replaced_by VARCHAR(120),
    user_agent  VARCHAR(300),
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- -----------------------------------------------------------------------------
-- password reset tokens
-- -----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id         BIGINT PRIMARY KEY DEFAULT nextval('seq_password_reset_id'),
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(120) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_password_reset_hash UNIQUE (token_hash)
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);

-- -----------------------------------------------------------------------------
-- exam_profiles — data-driven exam rules (never hardcoded in logic)
-- -----------------------------------------------------------------------------
CREATE TABLE exam_profiles (
    id                       BIGINT PRIMARY KEY DEFAULT nextval('seq_exam_profile_id'),
    code                     VARCHAR(60) NOT NULL,
    name                     VARCHAR(160) NOT NULL,
    description              TEXT,
    language                 VARCHAR(20) NOT NULL,
    keyboard_layout          VARCHAR(40) NOT NULL,
    duration_seconds         INTEGER NOT NULL,
    target_keystrokes        INTEGER,
    target_words             INTEGER,
    passing_net_wpm          NUMERIC(6,2) NOT NULL DEFAULT 0,
    word_length_chars        INTEGER NOT NULL DEFAULT 5,
    error_model              VARCHAR(40) NOT NULL,
    error_penalty_per_unit   NUMERIC(6,3) NOT NULL DEFAULT 1.0,
    backspace_allowed        BOOLEAN NOT NULL DEFAULT TRUE,
    show_live_wpm            BOOLEAN NOT NULL DEFAULT TRUE,
    is_alphanumeric          BOOLEAN NOT NULL DEFAULT FALSE,
    min_accuracy_pct         NUMERIC(5,2) NOT NULL DEFAULT 0,
    source_note              TEXT,
    active                   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order               INTEGER NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_exam_profiles_code UNIQUE (code),
    CONSTRAINT ck_exam_profiles_duration CHECK (duration_seconds > 0),
    CONSTRAINT ck_exam_profiles_wordlen CHECK (word_length_chars > 0),
    CONSTRAINT ck_exam_profiles_error_model
        CHECK (error_model IN ('FULL_AND_HALF_MISTAKES','PER_ERROR_PENALTY','ACCURACY_ONLY'))
);
CREATE INDEX idx_exam_profiles_active ON exam_profiles (active, sort_order);

-- -----------------------------------------------------------------------------
-- passages
-- -----------------------------------------------------------------------------
CREATE TABLE passages (
    id           BIGINT PRIMARY KEY DEFAULT nextval('seq_passage_id'),
    title        VARCHAR(200),
    content      TEXT NOT NULL,
    language     VARCHAR(20) NOT NULL,
    exam_type    VARCHAR(60) NOT NULL DEFAULT 'GENERAL',
    difficulty   VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    source_note  TEXT,
    char_count   INTEGER NOT NULL DEFAULT 0,
    word_count   INTEGER NOT NULL DEFAULT 0,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_passages_language CHECK (language IN ('EN','HI','TE','ALNUM')),
    CONSTRAINT ck_passages_difficulty CHECK (difficulty IN ('EASY','MEDIUM','HARD'))
);
CREATE INDEX idx_passages_pick ON passages (active, language, exam_type, difficulty);
CREATE INDEX idx_passages_char_count ON passages (char_count);

-- -----------------------------------------------------------------------------
-- mock_tests (a full-length mock is a named, ordered set of passages)
-- -----------------------------------------------------------------------------
CREATE TABLE mock_tests (
    id                BIGINT PRIMARY KEY DEFAULT nextval('seq_mock_test_id'),
    exam_code         VARCHAR(60) NOT NULL,
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    language          VARCHAR(20) NOT NULL,
    duration_seconds  INTEGER NOT NULL,
    is_full_mock      BOOLEAN NOT NULL DEFAULT TRUE,
    min_net_wpm       NUMERIC(6,2) NOT NULL DEFAULT 0,
    min_accuracy_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_mock_tests_exam_name UNIQUE (exam_code, name)
);
CREATE INDEX idx_mock_tests_exam ON mock_tests (exam_code, active, sort_order);

CREATE TABLE mock_test_passages (
    id           BIGINT PRIMARY KEY DEFAULT nextval('seq_mock_test_passage_id'),
    mock_test_id BIGINT NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    passage_id   BIGINT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_mock_test_passage UNIQUE (mock_test_id, position)
);
CREATE INDEX idx_mock_test_passages_test ON mock_test_passages (mock_test_id, position);

-- -----------------------------------------------------------------------------
-- attempts
-- -----------------------------------------------------------------------------
CREATE TABLE attempts (
    id                 BIGINT PRIMARY KEY DEFAULT nextval('seq_attempt_id'),
    user_id            BIGINT REFERENCES users(id) ON DELETE SET NULL,
    exam_code          VARCHAR(60) NOT NULL,
    mock_test_id       BIGINT REFERENCES mock_tests(id) ON DELETE SET NULL,
    passage_id         BIGINT REFERENCES passages(id) ON DELETE SET NULL,
    language           VARCHAR(20) NOT NULL,
    keyboard_layout    VARCHAR(40) NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    -- Snapshot of the profile rules at start time so later rule changes do not
    -- retroactively alter a stored result.
    duration_seconds   INTEGER NOT NULL,
    word_length_chars  INTEGER NOT NULL DEFAULT 5,
    error_model        VARCHAR(40) NOT NULL,
    error_penalty_per_unit NUMERIC(6,3) NOT NULL DEFAULT 1.0,
    passing_net_wpm    NUMERIC(6,2) NOT NULL DEFAULT 0,
    backspace_allowed  BOOLEAN NOT NULL DEFAULT TRUE,
    show_live_wpm      BOOLEAN NOT NULL DEFAULT TRUE,
    reference_text     TEXT NOT NULL,
    typed_text         TEXT,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at       TIMESTAMPTZ,
    duration_ms        BIGINT,
    keystroke_count    INTEGER NOT NULL DEFAULT 0,
    backspace_count    INTEGER NOT NULL DEFAULT 0,
    blur_count         INTEGER NOT NULL DEFAULT 0,
    cheat_flags        TEXT,
    -- server-computed results (NULL until submitted)
    gross_wpm          NUMERIC(8,2),
    net_wpm            NUMERIC(8,2),
    accuracy_pct       NUMERIC(6,2),
    full_mistakes      INTEGER,
    half_mistakes      INTEGER,
    passed             BOOLEAN,
    score_json         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_attempts_status CHECK (status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED','ABANDONED')),
    CONSTRAINT ck_attempts_language CHECK (language IN ('EN','HI','TE','ALNUM'))
);
CREATE INDEX idx_attempts_user_created ON attempts (user_id, created_at DESC);
CREATE INDEX idx_attempts_exam_submitted ON attempts (exam_code, submitted_at DESC);
CREATE INDEX idx_attempts_user_exam ON attempts (user_id, exam_code, submitted_at DESC);
CREATE INDEX idx_attempts_status ON attempts (status);

-- -----------------------------------------------------------------------------
-- attempt_events — raw keystroke / timing telemetry (server-side verification)
-- -----------------------------------------------------------------------------
CREATE TABLE attempt_events (
    id            BIGINT PRIMARY KEY DEFAULT nextval('seq_event_id'),
    attempt_id    BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    event_type    VARCHAR(30) NOT NULL,
    char_index    INTEGER,
    char_value    VARCHAR(8),
    key_code      VARCHAR(20),
    offset_ms     BIGINT,
    event_at      TIMESTAMPTZ NOT NULL,
    payload       TEXT,
    CONSTRAINT ck_attempt_events_type CHECK (event_type IN
        ('KEYSTROKE','BACKSPACE','BLUR','FOCUS','PASTE_ATTEMPT','DROP_ATTEMPT','COPY_ATTEMPT','CONTEXT_MENU'))
);
CREATE INDEX idx_attempt_events_attempt ON attempt_events (attempt_id, event_at);

-- -----------------------------------------------------------------------------
-- billing
-- -----------------------------------------------------------------------------
CREATE TABLE plans (
    id                BIGINT PRIMARY KEY DEFAULT nextval('seq_plan_id'),
    code              VARCHAR(40) NOT NULL,
    name              VARCHAR(120) NOT NULL,
    description       TEXT,
    price_paise       INTEGER NOT NULL DEFAULT 0,
    currency          VARCHAR(8) NOT NULL DEFAULT 'INR',
    duration_days     INTEGER NOT NULL DEFAULT 30,
    interval          VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    features          TEXT,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plans_code UNIQUE (code),
    CONSTRAINT ck_plans_interval CHECK (interval IN ('FREE','MONTHLY','QUARTERLY','YEARLY','LIFETIME')),
    CONSTRAINT ck_plans_price CHECK (price_paise >= 0)
);
CREATE INDEX idx_plans_active ON plans (active, sort_order);

CREATE TABLE coupons (
    id                 BIGINT PRIMARY KEY DEFAULT nextval('seq_coupon_id'),
    code               VARCHAR(40) NOT NULL,
    description        TEXT,
    discount_type      VARCHAR(20) NOT NULL,
    discount_value     NUMERIC(10,2) NOT NULL,
    max_redemptions    INTEGER,
    max_redemptions_per_user INTEGER NOT NULL DEFAULT 1,
    min_order_paise    INTEGER NOT NULL DEFAULT 0,
    starts_at          TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ,
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_coupons_code UNIQUE (code),
    CONSTRAINT ck_coupons_discount_type CHECK (discount_type IN ('PERCENTAGE','FLAT')),
    CONSTRAINT ck_coupons_discount_value CHECK (discount_value >= 0)
);
CREATE INDEX idx_coupons_active ON coupons (active);

CREATE TABLE coupon_redemptions (
    id           BIGINT PRIMARY KEY DEFAULT nextval('seq_redemption_id'),
    coupon_id    BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id     BIGINT,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_coupon_redemption UNIQUE (coupon_id, user_id, order_id)
);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions (user_id);

CREATE TABLE orders (
    id             BIGINT PRIMARY KEY DEFAULT nextval('seq_order_id'),
    order_number   VARCHAR(40) NOT NULL,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id        BIGINT NOT NULL REFERENCES plans(id),
    provider       VARCHAR(30) NOT NULL,
    provider_ref   VARCHAR(120),
    amount_paise   INTEGER NOT NULL,
    discount_paise INTEGER NOT NULL DEFAULT 0,
    total_paise    INTEGER NOT NULL,
    currency       VARCHAR(8) NOT NULL DEFAULT 'INR',
    coupon_id      BIGINT REFERENCES coupons(id),
    status         VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    -- manual gateway: UPI transaction reference supplied by the user
    manual_ref     VARCHAR(120),
    manual_note    VARCHAR(500),
    admin_note     VARCHAR(500),
    reviewed_by    BIGINT REFERENCES users(id),
    reviewed_at    TIMESTAMPTZ,
    idempotency_key VARCHAR(80),
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_orders_number UNIQUE (order_number),
    CONSTRAINT uq_orders_idempotency UNIQUE (idempotency_key),
    CONSTRAINT ck_orders_status CHECK (status IN
        ('CREATED','PENDING','PAID','FAILED','CANCELLED','EXPIRED','REJECTED','AWAITING_REVIEW','APPROVED'))
);
CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

CREATE TABLE payments (
    id            BIGINT PRIMARY KEY DEFAULT nextval('seq_payment_id'),
    order_id      BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(30) NOT NULL,
    provider_ref  VARCHAR(120),
    amount_paise  INTEGER NOT NULL,
    currency      VARCHAR(8) NOT NULL DEFAULT 'INR',
    status        VARCHAR(30) NOT NULL,
    method        VARCHAR(40),
    signature     VARCHAR(200),
    raw_payload   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payments_provider_ref UNIQUE (provider, provider_ref)
);
CREATE INDEX idx_payments_user ON payments (user_id, created_at DESC);
CREATE INDEX idx_payments_order ON payments (order_id);

CREATE TABLE subscriptions (
    id                BIGINT PRIMARY KEY DEFAULT nextval('seq_subscription_id'),
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id           BIGINT REFERENCES plans(id),
    order_id          BIGINT REFERENCES orders(id),
    provider          VARCHAR(30) NOT NULL,
    provider_ref      VARCHAR(120),
    status            VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    starts_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    auto_renew        BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_subscriptions_status CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','SUSPENDED')),
    CONSTRAINT ck_subscriptions_window CHECK (expires_at > starts_at)
);
CREATE INDEX idx_subscriptions_user ON subscriptions (user_id, status);
CREATE INDEX idx_subscriptions_expiry ON subscriptions (status, expires_at);

CREATE TABLE invoices (
    id            BIGINT PRIMARY KEY DEFAULT nextval('seq_invoice_id'),
    number        VARCHAR(40) NOT NULL,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id      BIGINT REFERENCES orders(id),
    subscription_id BIGINT REFERENCES subscriptions(id),
    plan_id       BIGINT REFERENCES plans(id),
    amount_paise  INTEGER NOT NULL,
    discount_paise INTEGER NOT NULL DEFAULT 0,
    total_paise   INTEGER NOT NULL,
    tax_paise     INTEGER NOT NULL DEFAULT 0,
    currency      VARCHAR(8) NOT NULL DEFAULT 'INR',
    status        VARCHAR(20) NOT NULL DEFAULT 'PAID',
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoices_number UNIQUE (number)
);
CREATE INDEX idx_invoices_user ON invoices (user_id, issued_at DESC);

-- -----------------------------------------------------------------------------
-- certificates
-- -----------------------------------------------------------------------------
CREATE TABLE certificates (
    id             BIGINT PRIMARY KEY DEFAULT nextval('seq_certificate_id'),
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id     BIGINT REFERENCES attempts(id) ON DELETE SET NULL,
    certificate_no VARCHAR(40) NOT NULL,
    display_name   VARCHAR(80) NOT NULL,
    exam_code      VARCHAR(60) NOT NULL,
    exam_name      VARCHAR(160) NOT NULL,
    net_wpm        NUMERIC(8,2) NOT NULL,
    accuracy_pct   NUMERIC(6,2) NOT NULL,
    target_wpm     NUMERIC(8,2) NOT NULL,
    language       VARCHAR(20) NOT NULL,
    issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_certificates_number UNIQUE (certificate_no)
);
CREATE INDEX idx_certificates_user ON certificates (user_id, issued_at DESC);

-- -----------------------------------------------------------------------------
-- smart practice drills
-- -----------------------------------------------------------------------------
CREATE TABLE drills (
    id            BIGINT PRIMARY KEY DEFAULT nextval('seq_drill_id'),
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language      VARCHAR(20) NOT NULL,
    focus         VARCHAR(60) NOT NULL DEFAULT 'MIXED',
    weak_keys     TEXT,
    weak_words    TEXT,
    passage_id    BIGINT REFERENCES passages(id) ON DELETE SET NULL,
    source        VARCHAR(30) NOT NULL DEFAULT 'ALGORITHMIC',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_drills_user ON drills (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- waitlist (used when PAYMENTS_MODE=disabled)
-- -----------------------------------------------------------------------------
CREATE TABLE waitlist (
    id         BIGINT PRIMARY KEY DEFAULT nextval('seq_waitlist_id'),
    email      VARCHAR(190) NOT NULL,
    source     VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_waitlist_email UNIQUE (email)
);

-- -----------------------------------------------------------------------------
-- audit log
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id          BIGINT PRIMARY KEY DEFAULT nextval('seq_audit_id'),
    actor_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60),
    entity_id   VARCHAR(60),
    details     TEXT,
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_log (created_at DESC);
CREATE INDEX idx_audit_actor ON audit_log (actor_id, created_at DESC);
