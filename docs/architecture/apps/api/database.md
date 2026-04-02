# Database Schema

Kanjo uses PostgreSQL 17 with a split ownership model between Kanjo and the external mf-fetch scraper.

## Ownership Model

### mf-fetch Owned Tables (Read-Only for Kanjo)

These tables are created and populated by the mf-fetch scraper. Kanjo only reads from them.

| Table          | Description                             |
| -------------- | --------------------------------------- |
| `transactions` | Transaction data from MoneyForward      |
| `daily_assets` | Daily balance snapshots per institution |
| `job_runs`     | Scraper job execution history           |

### Kanjo Owned Tables (Read-Write)

These tables are owned by Kanjo and store user enrichments and settings.

| Table                        | Description                       |
| ---------------------------- | --------------------------------- |
| `kanjo_transaction_metadata` | User enrichments for transactions |
| `kanjo_budget_categories`    | Budget definitions                |
| `kanjo_budget_periods`       | Monthly budget tracking           |
| `kanjo_institutions`         | Institution display settings      |
| `kanjo_savings_goals`        | User savings goals                |
| `kanjo_insights`             | AI-generated insights             |

---

## mf-fetch Tables (Reference Only)

### transactions

Transaction records imported from MoneyForward.

```sql
CREATE TABLE transactions (
    hash TEXT PRIMARY KEY,           -- SHA-256 of date|amount|account|description
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,         -- Positive = income, negative = expense
    category TEXT NOT NULL,          -- 大項目 only
    account_name TEXT NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
```

### daily_assets

Daily snapshots of account balances.

```sql
CREATE TABLE daily_assets (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    institution_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,        -- 預金, 投資信託, 株式, 年金, etc.
    balance INTEGER NOT NULL,
    UNIQUE(date, institution_name, asset_type)
);

CREATE INDEX idx_daily_assets_date ON daily_assets(date DESC);
```

---

## Kanjo Tables

### kanjo_transaction_metadata

User enrichments for transactions. Joins to `transactions` via `hash`.

```sql
CREATE TABLE kanjo_transaction_metadata (
    hash TEXT PRIMARY KEY REFERENCES transactions(hash) ON DELETE CASCADE,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    category_override TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### kanjo_budget_categories

Budget definitions per spending category.

```sql
CREATE TABLE kanjo_budget_categories (
    category_name TEXT PRIMARY KEY,
    monthly_budget INTEGER NOT NULL,
    rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### kanjo_budget_periods

Monthly budget tracking with rollover support.

```sql
CREATE TABLE kanjo_budget_periods (
    id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL REFERENCES kanjo_budget_categories(category_name),
    period DATE NOT NULL,            -- First day of month
    budget INTEGER NOT NULL,
    rollover INTEGER NOT NULL DEFAULT 0,
    spent INTEGER NOT NULL DEFAULT 0,
    UNIQUE(category_name, period)
);

CREATE INDEX idx_budget_periods_period ON kanjo_budget_periods(period DESC);
```

### kanjo_institutions

Institution display customization.

```sql
CREATE TABLE kanjo_institutions (
    institution_name TEXT PRIMARY KEY,
    display_name TEXT,
    icon TEXT,                       -- Icon identifier or URL
    color TEXT,                      -- Hex color code
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### kanjo_savings_goals

User-defined savings goals.

```sql
CREATE TABLE kanjo_savings_goals (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount INTEGER NOT NULL,
    current_amount INTEGER NOT NULL DEFAULT 0,
    deadline DATE,
    icon TEXT,
    color TEXT,
    achieved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### kanjo_insights

AI-generated insights and recommendations.

```sql
CREATE TABLE kanjo_insights (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,              -- alert, optimize, positive, anomaly
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_url TEXT,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_dismissed ON kanjo_insights(dismissed);
CREATE INDEX idx_insights_type ON kanjo_insights(type);
```

---

## Key Constraints

### Financial Amounts

All financial values are stored as **integers representing yen**. No floating point.

```sql
-- Correct: integer yen
amount INTEGER NOT NULL  -- 1234 means ¥1,234

-- Wrong: floating point
amount DECIMAL(10,2)     -- Don't use this
```

### Transaction Deduplication

Transactions are uniquely identified by a SHA-256 hash of:

```
date|amount|account_name|description
```

This prevents duplicate imports when re-scraping.

### Category Values

Categories match MoneyForward's 大項目 (main category) only. 中項目 (subcategory) is not imported.

Common categories:

- 食費
- 日用品
- 交通費
- 水道・光熱費
- 通信費
- 住宅
- 趣味・娯楽
- 衣服・美容
- 健康・医療
- 教養・教育
- 特別な支出
- 現金・カード
- 給与
- 臨時収入

---

## Migrations

Migrations are managed with [Goose](https://github.com/pressly/goose).

```bash
# Run pending migrations
task migrate

# Create new migration
task migrate:create -- add_new_table

# Rollback last migration
cd apps/api && goose -dir db/migrations postgres "$DATABASE_URL" down
```

Migration files are in `apps/api/db/migrations/` and follow the naming convention:

```
001_create_kanjo_transaction_metadata.sql
002_create_kanjo_budget_categories.sql
...
```

---

## Indexes

Key indexes for performance:

| Table                | Index       | Purpose               |
| -------------------- | ----------- | --------------------- |
| transactions         | date DESC   | Date range queries    |
| transactions         | category    | Category filtering    |
| daily_assets         | date DESC   | Asset history queries |
| kanjo_budget_periods | period DESC | Budget period lookups |
| kanjo_insights       | dismissed   | Active insights query |
