import { type ResultAsync, err, okAsync } from 'neverthrow';
import type { Config } from '../config.js';
import { type AppError, formatAppError } from '../errors.js';
import { getLogger } from '../logger.js';
import { createJobRun, updateJobRun, upsertTransactions, upsertDailyAssets } from '../db.js';
import { withSession } from './session.js';
import { fetchTransactionsForMonths, backfillTransactions } from './transactions.js';
import { fetchRecentDailyAssets, backfillDailyAssets } from './assets.js';
import { kickGlobalRefresh, refreshAccounts } from './refresh.js';
import type { JobType } from '../types.js';

interface InitialRunResult {
  transactionsCount: number;
  assetsCount: number;
}

interface FetchDailyResult {
  transactionsCount: number;
  assetsCount: number;
}

interface RefreshResult {
  accountsRefreshed: number;
}

function runJob<T>(
  jobType: JobType,
  config: Config,
  fn: (jobId: string) => ResultAsync<T, AppError>
): ResultAsync<T, AppError> {
  return createJobRun(jobType).andThen((jobId) => {
    const log = getLogger();
    log.info({ jobId, jobType }, 'Job started');

    return fn(jobId)
      .andThen((result) =>
        updateJobRun(jobId, 'completed').map(() => {
          log.info({ jobId, jobType, result }, 'Job completed');
          return result;
        })
      )
      .orElse((error) => {
        log.error({ jobId, jobType, error: formatAppError(error) }, 'Job failed');
        return updateJobRun(jobId, 'failed', formatAppError(error)).andThen(() => err(error));
      });
  });
}

export function initialRun(config: Config): ResultAsync<InitialRunResult, AppError> {
  return runJob('initial-run', config, (jobId) =>
    withSession(config, (ctx) => {
      return backfillTransactions(ctx.page, config.backfillStart)
        .andThen((transactions) =>
          upsertTransactions(transactions).map((inserted) => ({
            transactions,
            transactionsInserted: inserted,
          }))
        )
        .andThen(({ transactionsInserted }) =>
          backfillDailyAssets(ctx.page, config.backfillStart).andThen((assets) =>
            upsertDailyAssets(assets).andThen((assetsInserted) =>
              updateJobRun(jobId, 'running', undefined, transactionsInserted, assetsInserted).map(
                () => ({
                  transactionsCount: transactionsInserted,
                  assetsCount: assetsInserted,
                })
              )
            )
          )
        );
    })
  );
}

export function fetchDaily(config: Config): ResultAsync<FetchDailyResult, AppError> {
  return runJob('fetch-daily', config, (jobId) =>
    withSession(config, (ctx) => {
      return fetchTransactionsForMonths(ctx.page, config.csvMonths)
        .andThen((transactions) =>
          upsertTransactions(transactions).map((inserted) => ({
            transactions,
            transactionsInserted: inserted,
          }))
        )
        .andThen(({ transactionsInserted }) =>
          fetchRecentDailyAssets(ctx.page).andThen((assets) =>
            upsertDailyAssets(assets).andThen((assetsInserted) =>
              updateJobRun(jobId, 'running', undefined, transactionsInserted, assetsInserted).map(
                () => ({
                  transactionsCount: transactionsInserted,
                  assetsCount: assetsInserted,
                })
              )
            )
          )
        );
    })
  );
}

export function refresh(config: Config): ResultAsync<RefreshResult, AppError> {
  return runJob('refresh', config, () =>
    withSession(config, (ctx) => {
      if (config.refreshAccountIds && config.refreshAccountIds.length > 0) {
        return refreshAccounts(ctx.page, config, config.refreshAccountIds).map((count) => ({
          accountsRefreshed: count,
        }));
      }

      return kickGlobalRefresh(ctx.page, config).map((count) => ({
        accountsRefreshed: count,
      }));
    })
  );
}

export function loginOnly(config: Config): ResultAsync<void, AppError> {
  return runJob('login-only', config, () =>
    withSession(config, () => {
      const log = getLogger();
      log.info('Login-only mode - session established');
      return okAsync(undefined);
    })
  );
}
