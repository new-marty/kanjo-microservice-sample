-- +goose Up
CREATE SCHEMA IF NOT EXISTS kanjo;

-- Category definitions
CREATE TABLE kanjo.categories (
    id TEXT PRIMARY KEY,
    mf_category TEXT NOT NULL,
    display_name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    is_income BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalized merchant registry
CREATE TABLE kanjo.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_description TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,
    display_name TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Institution metadata
CREATE TABLE kanjo.institutions (
    institution_name TEXT PRIMARY KEY,
    display_name TEXT,
    icon TEXT,
    color TEXT DEFAULT '#6B7280',
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transformed transactions (main table for API)
CREATE TABLE kanjo.transactions (
    hash TEXT PRIMARY KEY,
    raw_hash TEXT NOT NULL,
    date DATE NOT NULL,
    amount BIGINT NOT NULL,
    account_name TEXT NOT NULL,
    description TEXT NOT NULL,
    merchant_id UUID REFERENCES kanjo.merchants(id),
    category_id TEXT REFERENCES kanjo.categories(id),
    is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    transfer_pair_hash TEXT,

    -- User overrides (editable by app)
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    category_override TEXT,
    notes TEXT,

    -- Confidence scores
    category_confidence INTEGER,
    merchant_confidence INTEGER,

    -- Metadata
    transformed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transform_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transformed daily assets
CREATE TABLE kanjo.daily_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id UUID NOT NULL,
    date DATE NOT NULL,
    institution_name TEXT NOT NULL REFERENCES kanjo.institutions(institution_name),
    account_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    balance BIGINT NOT NULL,
    transformed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, institution_name, account_name, asset_type)
);

-- Detected transfer pairs
CREATE TABLE kanjo.transfer_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_hash TEXT NOT NULL REFERENCES kanjo.transactions(hash),
    to_hash TEXT NOT NULL REFERENCES kanjo.transactions(hash),
    confidence INTEGER NOT NULL,
    auto_detected BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_hash, to_hash)
);

-- Detected recurring patterns
CREATE TABLE kanjo.recurring_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES kanjo.merchants(id),
    category_id TEXT REFERENCES kanjo.categories(id),
    description_pattern TEXT NOT NULL,
    amount_min BIGINT,
    amount_max BIGINT,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transform job runs
CREATE TABLE kanjo.transform_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_job_run_id UUID,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    transactions_processed INTEGER DEFAULT 0,
    transactions_transformed INTEGER DEFAULT 0,
    merchants_created INTEGER DEFAULT 0,
    transfers_matched INTEGER DEFAULT 0,
    llm_calls_made INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Budget categories
CREATE TABLE kanjo.budget_categories (
    category_name TEXT PRIMARY KEY,
    monthly_budget BIGINT NOT NULL,
    rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    color TEXT NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Budget periods
CREATE TABLE kanjo.budget_periods (
    id BIGSERIAL PRIMARY KEY,
    category_name TEXT NOT NULL REFERENCES kanjo.budget_categories(category_name) ON DELETE CASCADE,
    period DATE NOT NULL,
    budget BIGINT NOT NULL,
    rollover BIGINT NOT NULL DEFAULT 0,
    spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_name, period)
);

-- Savings goals
CREATE TABLE kanjo.savings_goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount BIGINT NOT NULL,
    current_amount BIGINT NOT NULL DEFAULT 0,
    deadline DATE,
    icon TEXT NOT NULL DEFAULT '🎯',
    color TEXT NOT NULL DEFAULT '#0891B2',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI insights
CREATE TABLE kanjo.insights (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('alert', 'optimize', 'positive', 'anomaly')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_url TEXT,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kanjo_transactions_date ON kanjo.transactions(date);
CREATE INDEX idx_kanjo_transactions_category ON kanjo.transactions(category_id);
CREATE INDEX idx_kanjo_transactions_merchant ON kanjo.transactions(merchant_id);
CREATE INDEX idx_kanjo_transactions_raw_hash ON kanjo.transactions(raw_hash);
CREATE INDEX idx_kanjo_daily_assets_date ON kanjo.daily_assets(date);
CREATE INDEX idx_kanjo_budget_periods_period ON kanjo.budget_periods(period);

-- +goose Down
DROP SCHEMA IF EXISTS kanjo CASCADE;
