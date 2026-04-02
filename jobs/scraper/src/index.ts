import { config } from 'dotenv';
config({ path: '../../.env' });
import pg from 'pg';
import { loadConfig, mask } from './config.js';
import { initLogger } from './logger.js';
import { initDb, closeDb } from './db.js';
import { initialRun, fetchDaily, refresh, loginOnly } from './mf/jobs.js';
import { formatAppError } from './errors.js';
import { loadSettingsFromDb } from './settings-db.js';

type Command = 'initial-run' | 'fetch-daily' | 'refresh' | 'login-only';

const COMMANDS: Command[] = ['initial-run', 'fetch-daily', 'refresh', 'login-only'];

function printUsage(): void {
  console.log(`
Usage: scraper <command>

Commands:
  initial-run   Backfill all historical transactions and assets
  fetch-daily   Sync recent transactions and assets (current + previous month)
  refresh       Trigger MoneyForward account refresh
  login-only    Authenticate only (for initial 2FA setup)

Environment variables:
  MF_EMAIL              MoneyForward login email (required)
  MF_PASSWORD           MoneyForward password (required)
  GMAIL_USER            Gmail for OTP retrieval (optional)
  GMAIL_APP_PASSWORD    Gmail app password for IMAP (optional)
  BLUEBUBBLES_URL       BlueBubbles server URL (optional)
  BLUEBUBBLES_PASSWORD  BlueBubbles password (optional)
  DATABASE_URL          PostgreSQL connection string (required)
  MF_USER_DATA_DIR      Browser session directory (default: .mf-user-data)
  MF_CSV_MONTHS         Months to fetch, comma-separated (default: 0,1)
  LOG_LEVEL             Logging level (default: info)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] as Command | undefined;

  if (!command || !COMMANDS.includes(command)) {
    printUsage();
    process.exit(command ? 1 : 0);
  }

  // Load DB settings first (if DATABASE_URL is available), then merge with env vars
  let dbOverrides: Record<string, string> | undefined;
  if (process.env.DATABASE_URL) {
    try {
      const tempPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const settings = await loadSettingsFromDb(tempPool);
      dbOverrides = Object.fromEntries(settings);
      await tempPool.end();
    } catch {
      // DB settings not available yet (first run, migration pending) — continue with env vars only
    }
  }

  const configResult = loadConfig(dbOverrides);
  if (configResult.isErr()) {
    console.error('Configuration error:', formatAppError(configResult.error));
    process.exit(1);
  }

  const config = configResult.value;
  const log = initLogger(config);

  log.info(
    {
      command,
      email: mask(config.mfEmail),
      gmail: config.gmailUser ? mask(config.gmailUser) : 'not configured',
      bluebubbles: config.blueBubblesUrl ? 'configured' : 'not configured',
    },
    'Starting scraper'
  );

  initDb(config);

  try {
    let result;

    switch (command) {
      case 'initial-run':
        result = await initialRun(config);
        break;
      case 'fetch-daily':
        result = await fetchDaily(config);
        break;
      case 'refresh':
        result = await refresh(config);
        break;
      case 'login-only':
        result = await loginOnly(config);
        break;
    }

    if (result.isErr()) {
      log.error({ error: formatAppError(result.error) }, 'Command failed');
      await closeDb();
      process.exit(1);
    }

    log.info({ result: result.value }, 'Command completed successfully');
    await closeDb();
    process.exit(0);
  } catch (e) {
    log.error({ error: e }, 'Unexpected error');
    await closeDb();
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
