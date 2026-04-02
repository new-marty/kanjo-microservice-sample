-- Schema for mf-fetch owned tables (read-only from Kanjo's perspective)
-- These tables are created and populated by the mf-fetch scraper
-- This file is used by sqlc for type generation only

-- Transactions table owned by mf-fetch
CREATE TABLE IF NOT EXISTS transactions (
    hash TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount BIGINT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    account_name TEXT NOT NULL,
    memo TEXT DEFAULT '',
    is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_name);

-- Daily assets table owned by mf-fetch
CREATE TABLE IF NOT EXISTS daily_assets (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    institution_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    balance BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'JPY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, institution_name, account_name, asset_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_assets_date ON daily_assets(date);

-- Job runs table owned by mf-fetch
CREATE TABLE IF NOT EXISTS job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    transactions_imported INTEGER DEFAULT 0,
    assets_imported INTEGER DEFAULT 0
);
