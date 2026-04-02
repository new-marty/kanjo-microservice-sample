import pg from 'pg';
import { ResultAsync } from 'neverthrow';
import type { Config } from './config.js';
import { databaseError, type DatabaseError } from './errors.js';
import { getLogger } from './logger.js';
import type {
  Transaction,
  DailyAsset,
  StorageState,
  MfSession,
  JobRun,
  JobType,
  JobStatus,
} from './types.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function initDb(config: Config): pg.Pool {
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

export function upsertTransactions(
  transactions: Transaction[]
): ResultAsync<number, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const client = getPool();

      if (transactions.length === 0) {
        return 0;
      }

      let insertedCount = 0;

      for (const tx of transactions) {
        const result = await client.query(
          `INSERT INTO mf_raw.transactions (
            hash, date, description, amount, category, sub_category,
            account_name, memo, is_transfer, is_recurring, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (hash) DO UPDATE SET
            date = EXCLUDED.date,
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            category = EXCLUDED.category,
            sub_category = EXCLUDED.sub_category,
            account_name = EXCLUDED.account_name,
            memo = EXCLUDED.memo,
            is_transfer = EXCLUDED.is_transfer,
            is_recurring = EXCLUDED.is_recurring,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted`,
          [
            tx.hash,
            tx.date,
            tx.description,
            tx.amount,
            tx.category,
            tx.subCategory,
            tx.accountName,
            tx.memo,
            tx.isTransfer,
            tx.isRecurring,
          ]
        );

        if ((result.rows[0] as { inserted?: boolean })?.inserted) {
          insertedCount++;
        }
      }

      log.info({ count: insertedCount, total: transactions.length }, 'Upserted transactions');
      return insertedCount;
    })(),
    (e) => databaseError('Failed to upsert transactions', e)
  );
}

export function upsertDailyAssets(assets: DailyAsset[]): ResultAsync<number, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const client = getPool();

      if (assets.length === 0) {
        return 0;
      }

      let insertedCount = 0;

      for (const asset of assets) {
        const result = await client.query(
          `INSERT INTO mf_raw.daily_assets (date, institution_name, account_name, asset_type, balance, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (date, institution_name, account_name, asset_type) DO UPDATE SET
             balance = EXCLUDED.balance,
             updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [asset.date, asset.institutionName, asset.accountName, asset.assetType, asset.balance]
        );

        if ((result.rows[0] as { inserted?: boolean })?.inserted) {
          insertedCount++;
        }
      }

      log.info({ count: insertedCount, total: assets.length }, 'Upserted daily assets');
      return insertedCount;
    })(),
    (e) => databaseError('Failed to upsert daily assets', e)
  );
}

export function saveSession(storageState: StorageState): ResultAsync<string, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const client = getPool();

      await client.query('DELETE FROM mf_raw.mf_session');

      const result = await client.query<{ id: string }>(
        `INSERT INTO mf_raw.mf_session (storage_state) VALUES ($1) RETURNING id`,
        [JSON.stringify(storageState)]
      );

      log.debug('Saved session to database');
      return result.rows[0].id;
    })(),
    (e) => databaseError('Failed to save session', e)
  );
}

export function getSession(): ResultAsync<MfSession | null, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const client = getPool();

      const result = await client.query<{
        id: string;
        storage_state: StorageState;
        created_at: Date;
        updated_at: Date;
      }>('SELECT id, storage_state, created_at, updated_at FROM mf_raw.mf_session LIMIT 1');

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        storageState: row.storage_state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    })(),
    (e) => databaseError('Failed to get session', e)
  );
}

export function createJobRun(jobType: JobType): ResultAsync<string, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const client = getPool();

      const result = await client.query<{ id: string }>(
        `INSERT INTO mf_raw.job_runs (job_type, status, started_at) VALUES ($1, 'running', NOW()) RETURNING id`,
        [jobType]
      );

      return result.rows[0].id;
    })(),
    (e) => databaseError('Failed to create job run', e)
  );
}

export function updateJobRun(
  id: string,
  status: JobStatus,
  error?: string,
  transactionsCount?: number,
  assetsCount?: number
): ResultAsync<void, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const client = getPool();

      await client.query(
        `UPDATE mf_raw.job_runs SET
           status = $2,
           completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
           error = COALESCE($3, error),
           transactions_count = COALESCE($4, transactions_count),
           assets_count = COALESCE($5, assets_count)
         WHERE id = $1`,
        [id, status, error, transactionsCount, assetsCount]
      );
    })(),
    (e) => databaseError('Failed to update job run', e)
  );
}

export function getLatestJobRun(jobType?: JobType): ResultAsync<JobRun | null, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const client = getPool();

      const query = jobType
        ? 'SELECT * FROM mf_raw.job_runs WHERE job_type = $1 ORDER BY started_at DESC LIMIT 1'
        : 'SELECT * FROM mf_raw.job_runs ORDER BY started_at DESC LIMIT 1';

      const params = jobType ? [jobType] : [];

      const result = await client.query<{
        id: string;
        job_type: JobType;
        status: JobStatus;
        started_at: Date;
        completed_at: Date | null;
        error: string | null;
        transactions_count: number;
        assets_count: number;
      }>(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        jobType: row.job_type,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        error: row.error,
        transactionsCount: row.transactions_count,
        assetsCount: row.assets_count,
      };
    })(),
    (e) => databaseError('Failed to get latest job run', e)
  );
}

export function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): ResultAsync<Transaction[], DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const client = getPool();

      const result = await client.query<{
        hash: string;
        date: Date;
        description: string;
        amount: string;
        category: string;
        sub_category: string | null;
        account_name: string;
        memo: string | null;
        is_transfer: boolean;
        is_recurring: boolean;
      }>(
        `SELECT hash, date, description, amount, category, sub_category,
                account_name, memo, is_transfer, is_recurring
         FROM mf_raw.transactions
         WHERE date >= $1 AND date <= $2
         ORDER BY date DESC`,
        [startDate, endDate]
      );

      return result.rows.map((row) => ({
        hash: row.hash,
        date: row.date,
        description: row.description,
        amount: parseInt(row.amount, 10),
        category: row.category,
        subCategory: row.sub_category,
        accountName: row.account_name,
        memo: row.memo,
        isTransfer: row.is_transfer,
        isRecurring: row.is_recurring,
      }));
    })(),
    (e) => databaseError('Failed to get transactions by date range', e)
  );
}
