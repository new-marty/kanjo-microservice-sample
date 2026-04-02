-- +goose Up
CREATE SCHEMA IF NOT EXISTS mf_raw;

-- Raw transactions from MoneyForward CSV
CREATE TABLE mf_raw.transactions (
    hash TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount BIGINT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    account_name TEXT NOT NULL,
    memo TEXT,
    is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw daily asset snapshots
CREATE TABLE mf_raw.daily_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    institution_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    balance BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, institution_name, account_name, asset_type)
);

-- Browser session persistence
CREATE TABLE mf_raw.mf_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scraper job runs
CREATE TABLE mf_raw.job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('initial-run', 'fetch-daily', 'refresh', 'login-only')),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error TEXT,
    transactions_count INTEGER DEFAULT 0,
    assets_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mf_raw_transactions_date ON mf_raw.transactions(date);
CREATE INDEX idx_mf_raw_transactions_category ON mf_raw.transactions(category);
CREATE INDEX idx_mf_raw_daily_assets_date ON mf_raw.daily_assets(date);
CREATE INDEX idx_mf_raw_job_runs_status ON mf_raw.job_runs(status);

-- NOTIFY trigger for job completion
-- +goose StatementBegin
CREATE FUNCTION mf_raw.notify_job_completed() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status = 'running' THEN
        PERFORM pg_notify('mf_job_completed', json_build_object(
            'job_id', NEW.id,
            'job_type', NEW.job_type,
            'transactions_count', NEW.transactions_count,
            'assets_count', NEW.assets_count
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER job_completed_notify
    AFTER UPDATE ON mf_raw.job_runs
    FOR EACH ROW EXECUTE FUNCTION mf_raw.notify_job_completed();

-- +goose Down
DROP SCHEMA IF EXISTS mf_raw CASCADE;
