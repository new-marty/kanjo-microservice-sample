import { z } from 'zod';
import { err, ok, type Result } from 'neverthrow';
import { type ConfigError, configError } from './errors.js';

const configSchema = z.object({
  mfEmail: z.string().email(),
  mfPassword: z.string().min(1),

  gmailUser: z.string().email().optional(),
  gmailAppPassword: z.string().optional(),

  blueBubblesUrl: z.string().url().optional(),
  blueBubblesPassword: z.string().optional(),

  databaseUrl: z.string().url(),

  userDataDir: z.string().default('.mf-user-data'),

  csvMonths: z.array(z.number().int().min(0)).default([0, 1]),

  refreshAccountIds: z.array(z.string()).optional(),

  backfillStart: z.date().optional(),

  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

function parseMonthsList(value: string | undefined): number[] {
  if (!value) return [0, 1];
  return value
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0);
}

function parseAccountIds(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export function loadConfig(
  overrides?: Partial<Record<string, string>>
): Result<Config, ConfigError> {
  const env = process.env;

  const raw = {
    mfEmail: overrides?.mf_email || env.MF_EMAIL,
    mfPassword: overrides?.mf_password || env.MF_PASSWORD,
    gmailUser: overrides?.gmail_user || env.GMAIL_USER,
    gmailAppPassword: overrides?.gmail_app_password || env.GMAIL_APP_PASSWORD,
    blueBubblesUrl: overrides?.bluebubbles_url || env.BLUEBUBBLES_URL,
    blueBubblesPassword: overrides?.bluebubbles_password || env.BLUEBUBBLES_PASSWORD,
    databaseUrl: env.DATABASE_URL,
    userDataDir: env.MF_USER_DATA_DIR || '.mf-user-data',
    csvMonths: parseMonthsList(env.MF_CSV_MONTHS),
    refreshAccountIds: parseAccountIds(env.MF_REFRESH_ACCOUNT_IDS),
    backfillStart: parseDate(env.MF_BACKFILL_START),
    logLevel: env.LOG_LEVEL || 'info',
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return err(configError(`Invalid configuration: ${issues.join(', ')}`));
  }

  return ok(result.data);
}

export function hasGmailConfig(config: Config): boolean {
  return Boolean(config.gmailUser && config.gmailAppPassword);
}

export function hasBlueBubblesConfig(config: Config): boolean {
  return Boolean(config.blueBubblesUrl && config.blueBubblesPassword);
}

export function mask(value: string): string {
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}
