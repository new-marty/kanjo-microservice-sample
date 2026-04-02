import type pg from 'pg';

interface AppSetting {
  key: string;
  value: string;
}

/**
 * Load app settings from the kanjo.app_settings table.
 * Returns a map of key -> value for non-empty settings.
 */
export async function loadSettingsFromDb(pool: pg.Pool): Promise<Map<string, string>> {
  const result = await pool.query<AppSetting>(
    `SELECT key, value FROM kanjo.app_settings WHERE value != ''`
  );

  const settings = new Map<string, string>();
  for (const row of result.rows) {
    settings.set(row.key, row.value);
  }
  return settings;
}
