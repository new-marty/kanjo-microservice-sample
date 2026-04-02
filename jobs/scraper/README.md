# @repo/scraper

MoneyForward ME scraper for Kanjo. Downloads transactions and asset data from MoneyForward ME and writes to PostgreSQL.

## Features

- **Transaction CSV Download**: Downloads and parses MoneyForward ME transaction CSVs (Shift-JIS encoded)
- **Daily Asset Scraping**: Scrapes daily balance snapshots from account pages
- **Dual OTP Support**:
  - **Gmail IMAP**: For MoneyForward login OTP
  - **BlueBubbles SMS**: For bank/credit card refresh OTP
- **Session Persistence**: Browser cookies saved to database for session reuse
- **Job Tracking**: All scraper runs logged with status and counts

## Prerequisites

1. **MoneyForward ME account** with linked financial institutions
2. **Gmail account** with App Password for IMAP access (for MF login OTP)
3. **BlueBubbles server** (optional, for bank SMS 2FA)
4. **PostgreSQL** database with migrations applied

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
MF_EMAIL=your-email@example.com
MF_PASSWORD=your-moneyforward-password
DATABASE_URL=postgresql://dev:dev@localhost:5432/kanjo

# Gmail IMAP (for MF login OTP)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# BlueBubbles (for bank SMS OTP) - optional
BLUEBUBBLES_URL=https://your-tunnel.trycloudflare.com
BLUEBUBBLES_PASSWORD=your-bluebubbles-password

# Optional
MF_USER_DATA_DIR=.mf-user-data
MF_CSV_MONTHS=0,1
LOG_LEVEL=info
```

### Getting Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Create new app password for "Mail"
5. Use the 16-character password in `GMAIL_APP_PASSWORD`

## Commands

### Interactive Login (First Time Setup)

```bash
task scraper:login
```

This establishes a browser session with 2FA. Required before running other commands.

### Daily Sync

```bash
task scraper:fetch
```

Fetches transactions from current and previous month, plus today's and yesterday's asset snapshots.

### Initial Backfill

```bash
task scraper:initial
```

Backfills all historical transactions and assets until it finds 3 consecutive empty months.

### Account Refresh

```bash
task scraper:refresh
```

Triggers MoneyForward to refresh data from linked institutions. Uses BlueBubbles for bank SMS OTP if configured.

## Manual Testing

### 1. Start Database

```bash
task dev:db
```

### 2. Run Migrations

```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/kanjo task migrate
```

### 3. Install Playwright Browser

```bash
cd jobs/scraper && npx playwright install chromium
```

### 4. Configure Environment

```bash
cp jobs/scraper/.env.example jobs/scraper/.env
# Edit .env with your credentials
```

### 5. Run Interactive Login

```bash
cd jobs/scraper
source .env && pnpm run login-only
```

This will:

- Launch Chromium
- Navigate to MoneyForward login
- Request OTP (via Gmail or TTY input)
- Save session to database

### 6. Fetch Data

```bash
source .env && pnpm run fetch-daily
```

### 7. Verify Data

```bash
psql postgresql://dev:dev@localhost:5432/kanjo -c "SELECT COUNT(*) FROM transactions"
psql postgresql://dev:dev@localhost:5432/kanjo -c "SELECT COUNT(*) FROM daily_assets"
psql postgresql://dev:dev@localhost:5432/kanjo -c "SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 5"
```

## Database Tables

The scraper writes to these tables (defined in `apps/api/db/migrations/007_create_mf_tables.sql`):

### `transactions`

| Column       | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| hash         | TEXT PK | SHA-256 hash for deduplication     |
| date         | DATE    | Transaction date                   |
| description  | TEXT    | Transaction description            |
| amount       | BIGINT  | Amount in yen (negative = expense) |
| category     | TEXT    | Main category (大項目)             |
| sub_category | TEXT    | Subcategory (中項目)               |
| account_name | TEXT    | Account name                       |
| memo         | TEXT    | Transaction memo                   |
| is_transfer  | BOOLEAN | Transfer transaction flag          |
| is_recurring | BOOLEAN | Recurring transaction flag         |

### `daily_assets`

| Column           | Type   | Description                       |
| ---------------- | ------ | --------------------------------- |
| date             | DATE   | Snapshot date                     |
| institution_name | TEXT   | Financial institution             |
| account_name     | TEXT   | Account name                      |
| asset_type       | TEXT   | Asset type (預金, 投資信託, etc.) |
| balance          | BIGINT | Balance in yen                    |

### `mf_session`

Browser session persistence (cookies and storage state).

### `job_runs`

Job execution history with status and counts.

## Architecture

```
src/
├── index.ts          # CLI entry point
├── config.ts         # Environment config with Zod validation
├── db.ts             # PostgreSQL operations
├── logger.ts         # Pino logger
├── errors.ts         # Error types with neverthrow
├── types.ts          # TypeScript interfaces
├── otp/
│   ├── gmail.ts      # Gmail IMAP OTP fetcher
│   └── bluebubbles.ts# BlueBubbles SMS OTP fetcher
└── mf/
    ├── session.ts    # Browser session management
    ├── transactions.ts# CSV download and parsing
    ├── assets.ts     # Asset page scraping
    ├── refresh.ts    # Account refresh with OTP
    └── jobs.ts       # Job orchestration
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test
```

## Docker

The scraper can run in Docker using the `scraper` profile:

```bash
docker compose --profile scraper up scraper
```

See `compose.yml` for configuration.

## Troubleshooting

### "Session expired"

Run `task scraper:login` to establish a new session.

### "Timeout waiting for OTP"

- Check Gmail App Password is correct
- Check BlueBubbles URL is accessible
- Fall back to TTY input if needed

### "No asset table found"

MoneyForward page structure may have changed. Check the selectors in `src/mf/assets.ts`.

### "Failed to parse CSV"

CSV format may have changed. Check column headers in `src/mf/transactions.ts`.
