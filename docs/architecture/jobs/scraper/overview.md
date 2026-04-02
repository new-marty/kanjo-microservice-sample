# Scraper Job

The scraper job is a TypeScript/Playwright service that authenticates with MoneyForward ME, exports financial data, and writes it to the `mf_raw` schema.

## What It Does

1. Authenticates with MoneyForward ME (handles 2FA on first login)
2. Downloads CSV transaction exports
3. Parses and deduplicates transactions by SHA-256 hash
4. Writes to `mf_raw.transactions` and `mf_raw.daily_assets`
5. Records job execution in `mf_raw.job_runs`
6. Fires `NOTIFY mf_job_completed` on completion to trigger the transform pipeline

## Tables Owned

| Table                 | Description                      |
| --------------------- | -------------------------------- |
| `mf_raw.transactions` | Raw transactions from CSV export |
| `mf_raw.daily_assets` | Daily balance snapshots          |
| `mf_raw.mf_session`   | Browser session persistence      |
| `mf_raw.job_runs`     | Job execution history            |

## Commands

```bash
task scraper:login    # Interactive login for initial 2FA setup
task scraper:initial  # Run initial backfill (downloads CSV history)
task scraper:fetch    # Run daily fetch job
task scraper:refresh  # Trigger MoneyForward account refresh
```

## Event Coordination

On job completion, a database trigger fires `NOTIFY mf_job_completed` with a JSON payload:

```sql
pg_notify('mf_job_completed', json_build_object(
    'job_id', NEW.id,
    'job_type', NEW.job_type,
    'transactions_count', NEW.transactions_count
)::text);
```

The [transform job](../transform/overview.md) listens for this event in listener mode.
