-- ============================================================
-- EVENT ATTENDANCE TRACKING SYSTEM
-- Production-Ready PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_account_status AS ENUM (
    'pending_verification',
    'active',
    'suspended',
    'deactivated'
);

CREATE TYPE organization_member_role AS ENUM (
    'admin',
    'member'
);

CREATE TYPE organization_member_status AS ENUM (
    'invited',
    'active',
    'suspended',
    'left',
    'removed'
);

CREATE TYPE invite_type AS ENUM (
    'organization',
    'event'
);

CREATE TYPE invite_status AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);

CREATE TYPE auth_provider AS ENUM (
    'local',
    'google',
    'github',
    'microsoft'
);

CREATE TYPE event_visibility AS ENUM (
    'draft',
    'published',
    'cancelled',
    'completed'
);

CREATE TYPE attendance_scope AS ENUM (
    'organization_only',
    'allowlist_only',
    'open'
);

CREATE TYPE attendance_code_status AS ENUM (
    'active',
    'rotated',
    'expired',
    'revoked'
);

CREATE TYPE attendance_status AS ENUM (
    'on_time',
    'late'
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           VARCHAR(150)            NOT NULL,
    email               VARCHAR(255)            NOT NULL,
    password_hash       VARCHAR(255),
    profile_image_url   VARCHAR(500),
    status              user_account_status     NOT NULL DEFAULT 'pending_verification',
    is_email_verified   BOOLEAN                 NOT NULL DEFAULT FALSE,
    last_sign_in_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_full_name_length CHECK (LENGTH(TRIM(full_name)) >= 2)
);

COMMENT ON TABLE users IS 'System-wide user accounts. password_hash is NULL for OAuth-only users.';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete; application should filter WHERE deleted_at IS NULL.';

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- OAUTH ACCOUNTS
-- ============================================================

CREATE TABLE oauth_accounts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID            NOT NULL,
    provider                auth_provider   NOT NULL,
    provider_account_id     VARCHAR(255)    NOT NULL,
    access_token            TEXT,
    refresh_token           TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_oauth_provider_account UNIQUE (provider, provider_account_id)
);

COMMENT ON TABLE oauth_accounts IS 'OAuth provider linkages per user. One user can link multiple providers.';

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts (user_id);

-- ============================================================
-- EMAIL VERIFICATION TOKENS
-- ============================================================

CREATE TABLE email_verification_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL,
    token           VARCHAR(255)    NOT NULL,
    expires_at      TIMESTAMPTZ     NOT NULL,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evtoken_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_evtoken_token UNIQUE (token),
    CONSTRAINT chk_evtoken_expires CHECK (expires_at > created_at),
    CONSTRAINT chk_evtoken_verified CHECK (
        verified_at IS NULL OR verified_at <= NOW()
    )
);

COMMENT ON TABLE email_verification_tokens IS 'One-time tokens for email verification. Expire and become unusable once verified_at is set.';

CREATE INDEX idx_evtoken_user_id ON email_verification_tokens (user_id);
CREATE INDEX idx_evtoken_token ON email_verification_tokens (token);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL,
    token           VARCHAR(255)    NOT NULL,
    expires_at      TIMESTAMPTZ     NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prtoken_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_prtoken_token UNIQUE (token),
    CONSTRAINT chk_prtoken_expires CHECK (expires_at > created_at),
    CONSTRAINT chk_prtoken_used CHECK (
        used_at IS NULL OR used_at <= NOW()
    )
);

COMMENT ON TABLE password_reset_tokens IS 'One-time password reset tokens. used_at marks them as consumed.';

CREATE INDEX idx_prtoken_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_prtoken_token ON password_reset_tokens (token);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(150)    NOT NULL,
    description         TEXT,
    join_code           VARCHAR(50)     NOT NULL,
    created_by_user_id  UUID            NOT NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_org_created_by FOREIGN KEY (created_by_user_id)
        REFERENCES users (id),
    CONSTRAINT uq_org_join_code UNIQUE (join_code),
    CONSTRAINT chk_org_name_length CHECK (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT chk_org_join_code_length CHECK (LENGTH(TRIM(join_code)) >= 6)
);

COMMENT ON TABLE organizations IS 'Top-level organizations. Each has a unique join_code for self-joining.';
COMMENT ON COLUMN organizations.join_code IS 'Short alphanumeric code. Application should generate this on creation.';

CREATE INDEX idx_organizations_join_code ON organizations (join_code);
CREATE INDEX idx_organizations_created_by ON organizations (created_by_user_id);

-- ============================================================
-- PBAC POLICIES
-- ============================================================

CREATE TABLE pbac_policies (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id             UUID            NOT NULL,
    policy_name                 VARCHAR(100)    NOT NULL,
    description                 TEXT,

    -- User namespace
    users_read                  BOOLEAN NOT NULL DEFAULT FALSE,
    users_write                 BOOLEAN NOT NULL DEFAULT FALSE,

    -- Organization namespace
    organization_read           BOOLEAN NOT NULL DEFAULT FALSE,
    organization_write          BOOLEAN NOT NULL DEFAULT FALSE,

    -- Members namespace
    members_read                BOOLEAN NOT NULL DEFAULT FALSE,
    members_invite              BOOLEAN NOT NULL DEFAULT FALSE,
    members_write               BOOLEAN NOT NULL DEFAULT FALSE,
    members_remove              BOOLEAN NOT NULL DEFAULT FALSE,
    members_change_role         BOOLEAN NOT NULL DEFAULT FALSE,
    members_assign_pbac         BOOLEAN NOT NULL DEFAULT FALSE,

    -- Events namespace
    events_read                 BOOLEAN NOT NULL DEFAULT FALSE,
    events_write                BOOLEAN NOT NULL DEFAULT FALSE,
    events_update               BOOLEAN NOT NULL DEFAULT FALSE,
    events_delete               BOOLEAN NOT NULL DEFAULT FALSE,
    events_publish              BOOLEAN NOT NULL DEFAULT FALSE,
    events_lock                 BOOLEAN NOT NULL DEFAULT FALSE,

    -- Attendance code namespace
    attendance_code_read        BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_code_rotate      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Attendance records namespace
    attendance_read             BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_submit           BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_override         BOOLEAN NOT NULL DEFAULT FALSE,

    -- Analytics namespace
    analytics_read              BOOLEAN NOT NULL DEFAULT FALSE,

    created_by_member_id        UUID,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pbac_organization FOREIGN KEY (organization_id)
        REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT uq_pbac_org_policy_name UNIQUE (organization_id, policy_name),
    CONSTRAINT chk_pbac_policy_name_length CHECK (LENGTH(TRIM(policy_name)) >= 2)
);

COMMENT ON TABLE pbac_policies IS 'Per-organization PBAC policy templates. Each boolean column maps to one specific action permission.';
COMMENT ON COLUMN pbac_policies.created_by_member_id IS 'FK added after organization_members table is created via ALTER TABLE.';

CREATE INDEX idx_pbac_policies_organization_id ON pbac_policies (organization_id);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

CREATE TABLE organization_members (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID                        NOT NULL,
    user_id                 UUID                        NOT NULL,
    role                    organization_member_role    NOT NULL DEFAULT 'member',
    status                  organization_member_status  NOT NULL DEFAULT 'active',
    pbac_policy_id          UUID,
    is_root_admin           BOOLEAN                     NOT NULL DEFAULT FALSE,
    invited_by_member_id    UUID,
    joined_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_member_organization FOREIGN KEY (organization_id)
        REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_member_pbac FOREIGN KEY (pbac_policy_id)
        REFERENCES pbac_policies (id) ON DELETE SET NULL,
    CONSTRAINT fk_member_invited_by FOREIGN KEY (invited_by_member_id)
        REFERENCES organization_members (id) ON DELETE SET NULL,
    CONSTRAINT uq_member_org_user UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE organization_members IS 'Junction table linking users to organizations. is_root_admin marks the original creator who cannot be removed without ownership transfer.';
COMMENT ON COLUMN organization_members.pbac_policy_id IS 'NULL means no extra fine-grained policy; fall back to role-level defaults.';

CREATE INDEX idx_org_members_organization_id ON organization_members (organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members (user_id);
CREATE INDEX idx_org_members_pbac_policy_id ON organization_members (pbac_policy_id);
CREATE INDEX idx_org_members_is_root_admin ON organization_members (organization_id, is_root_admin) WHERE is_root_admin = TRUE;

-- Back-fill FK on pbac_policies now that organization_members exists
ALTER TABLE pbac_policies
    ADD CONSTRAINT fk_pbac_created_by_member FOREIGN KEY (created_by_member_id)
        REFERENCES organization_members (id) ON DELETE SET NULL;

-- ============================================================
-- INVITES
-- ============================================================

CREATE TABLE invites (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID            NOT NULL,
    event_id                UUID,
    invite_type             invite_type     NOT NULL,
    email                   VARCHAR(255)    NOT NULL,
    token                   VARCHAR(255)    NOT NULL,
    invited_by_member_id    UUID            NOT NULL,
    status                  invite_status   NOT NULL DEFAULT 'pending',
    expires_at              TIMESTAMPTZ     NOT NULL,
    accepted_by_user_id     UUID,
    accepted_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invite_organization FOREIGN KEY (organization_id)
        REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_invited_by FOREIGN KEY (invited_by_member_id)
        REFERENCES organization_members (id),
    CONSTRAINT fk_invite_accepted_by FOREIGN KEY (accepted_by_user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_invite_token UNIQUE (token),
    CONSTRAINT chk_invite_expires CHECK (expires_at > created_at),
    CONSTRAINT chk_invite_accepted CHECK (
        (accepted_at IS NULL AND accepted_by_user_id IS NULL)
        OR
        (accepted_at IS NOT NULL AND accepted_by_user_id IS NOT NULL)
    ),
    CONSTRAINT chk_invite_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
    )
);

COMMENT ON TABLE invites IS 'Organization and event invitations sent via email. event_id is nullable for org-level invites.';

CREATE INDEX idx_invites_organization_id ON invites (organization_id);
CREATE INDEX idx_invites_email ON invites (email);
CREATE INDEX idx_invites_token ON invites (token);
CREATE INDEX idx_invites_status ON invites (status);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id             UUID                NOT NULL,
    created_by_member_id        UUID                NOT NULL,
    title                       VARCHAR(150)        NOT NULL,
    description                 TEXT,
    venue                       VARCHAR(200),
    starts_at                   TIMESTAMPTZ         NOT NULL,
    ends_at                     TIMESTAMPTZ         NOT NULL,
    attendance_opens_at         TIMESTAMPTZ         NOT NULL,
    attendance_closes_at        TIMESTAMPTZ         NOT NULL,
    late_after_minutes          INT                 NOT NULL DEFAULT 0,
    attendance_scope            attendance_scope    NOT NULL DEFAULT 'organization_only',
    is_locked                   BOOLEAN             NOT NULL DEFAULT FALSE,
    visibility                  event_visibility    NOT NULL DEFAULT 'draft',
    created_at                  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_organization FOREIGN KEY (organization_id)
        REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_created_by FOREIGN KEY (created_by_member_id)
        REFERENCES organization_members (id),
    CONSTRAINT chk_event_time_order CHECK (ends_at > starts_at),
    CONSTRAINT chk_event_attendance_window CHECK (attendance_closes_at > attendance_opens_at),
    CONSTRAINT chk_event_title_length CHECK (LENGTH(TRIM(title)) >= 2),
    CONSTRAINT chk_event_late_minutes CHECK (late_after_minutes >= 0),
    CONSTRAINT fk_invite_event FOREIGN KEY (id)
        REFERENCES events (id)
);

COMMENT ON TABLE events IS 'Each organization can have unlimited events. Attendance window is separate from event time window.';
COMMENT ON COLUMN events.late_after_minutes IS 'Number of minutes after attendance_opens_at before a submission is marked late.';
COMMENT ON COLUMN events.is_locked IS 'When true, only org members or the allowlist can attend regardless of attendance_scope.';

-- Add FK from invites to events now that events table exists
ALTER TABLE invites
    ADD CONSTRAINT fk_invite_event_id FOREIGN KEY (event_id)
        REFERENCES events (id) ON DELETE CASCADE;

CREATE INDEX idx_events_organization_id ON events (organization_id);
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_events_visibility ON events (visibility);
CREATE INDEX idx_events_attendance_scope ON events (attendance_scope);

-- ============================================================
-- ATTENDANCE TRACKING CODES
-- ============================================================

CREATE TABLE attendance_tracking_codes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id                UUID                        NOT NULL,
    code                    VARCHAR(50)                 NOT NULL,
    status                  attendance_code_status      NOT NULL DEFAULT 'active',
    rotated_from_code_id    UUID,
    generated_by_member_id  UUID                        NOT NULL,
    valid_from              TIMESTAMPTZ                 NOT NULL,
    valid_until             TIMESTAMPTZ                 NOT NULL,
    created_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_atc_event FOREIGN KEY (event_id)
        REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_atc_generated_by FOREIGN KEY (generated_by_member_id)
        REFERENCES organization_members (id),
    CONSTRAINT fk_atc_rotated_from FOREIGN KEY (rotated_from_code_id)
        REFERENCES attendance_tracking_codes (id) ON DELETE SET NULL,
    CONSTRAINT uq_atc_event_code UNIQUE (event_id, code),
    CONSTRAINT chk_atc_valid_window CHECK (valid_until > valid_from)
);

COMMENT ON TABLE attendance_tracking_codes IS 'Supports code rotation. rotated_from_code_id tracks the rotation chain. Only one code per event should have status=active at any time — enforced via partial unique index.';

CREATE UNIQUE INDEX uq_atc_one_active_per_event
    ON attendance_tracking_codes (event_id)
    WHERE status = 'active';

CREATE INDEX idx_atc_event_id ON attendance_tracking_codes (event_id);
CREATE INDEX idx_atc_code ON attendance_tracking_codes (code);
CREATE INDEX idx_atc_status ON attendance_tracking_codes (status);

-- ============================================================
-- EVENT ALLOWED USERS (allowlist_only mode)
-- ============================================================

CREATE TABLE event_allowed_users (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id                UUID        NOT NULL,
    user_id                 UUID        NOT NULL,
    added_by_member_id      UUID        NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_eau_event FOREIGN KEY (event_id)
        REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_eau_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_eau_added_by FOREIGN KEY (added_by_member_id)
        REFERENCES organization_members (id),
    CONSTRAINT uq_eau_event_user UNIQUE (event_id, user_id)
);

COMMENT ON TABLE event_allowed_users IS 'Pre-defined allowlist per event. Only relevant when attendance_scope = allowlist_only.';

CREATE INDEX idx_eau_event_id ON event_allowed_users (event_id);
CREATE INDEX idx_eau_user_id ON event_allowed_users (user_id);

-- ============================================================
-- ATTENDANCE RECORDS
-- ============================================================

CREATE TABLE attendance_records (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id                UUID                NOT NULL,
    attendance_code_id      UUID                NOT NULL,
    user_id                 UUID                NOT NULL,
    organization_member_id  UUID,
    submitted_code          VARCHAR(50)         NOT NULL,
    attended_at             TIMESTAMPTZ         NOT NULL,
    attendance_status       attendance_status   NOT NULL,
    is_manual_override      BOOLEAN             NOT NULL DEFAULT FALSE,
    override_by_member_id   UUID,
    notes                   TEXT,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ar_event FOREIGN KEY (event_id)
        REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_atc FOREIGN KEY (attendance_code_id)
        REFERENCES attendance_tracking_codes (id),
    CONSTRAINT fk_ar_user FOREIGN KEY (user_id)
        REFERENCES users (id),
    CONSTRAINT fk_ar_member FOREIGN KEY (organization_member_id)
        REFERENCES organization_members (id) ON DELETE SET NULL,
    CONSTRAINT fk_ar_override_by FOREIGN KEY (override_by_member_id)
        REFERENCES organization_members (id) ON DELETE SET NULL,
    CONSTRAINT uq_ar_event_user UNIQUE (event_id, user_id),
    CONSTRAINT chk_ar_override CHECK (
        (is_manual_override = FALSE AND override_by_member_id IS NULL)
        OR
        (is_manual_override = TRUE AND override_by_member_id IS NOT NULL)
    )
);

COMMENT ON TABLE attendance_records IS 'One record per user per event. organization_member_id is NULL for non-member attendees in open events.';
COMMENT ON COLUMN attendance_records.attendance_code_id IS 'References the exact code version used at submission time for audit purposes.';

CREATE INDEX idx_ar_event_id ON attendance_records (event_id);
CREATE INDEX idx_ar_user_id ON attendance_records (user_id);
CREATE INDEX idx_ar_attendance_status ON attendance_records (attendance_status);
CREATE INDEX idx_ar_attended_at ON attendance_records (attended_at);

-- ============================================================
-- UPDATED_AT AUTO-UPDATE TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_pbac_policies
    BEFORE UPDATE ON pbac_policies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organization_members
    BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
