import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export interface DbConfig {
  databaseUrl: string;
}

export function initDb(config: DbConfig): pg.Pool {
  pool = new Pool({
    connectionString: config.databaseUrl,
  });
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
