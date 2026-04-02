import { ResultAsync } from 'neverthrow';
import type { Page } from 'playwright';
import { networkError, parseError, type AppError } from '../errors.js';
import { getLogger } from '../logger.js';
import type { DailyAsset } from '../types.js';

const MF_PORTFOLIO_URL = 'https://moneyforward.com/bs/portfolio';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseYenAmount(text: string): number {
  const cleaned = text.replace(/[,¥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Fetches current asset balances from the portfolio page.
 * MoneyForward ME doesn't provide historical balance data via URL,
 * so we fetch the current snapshot and associate it with today's date.
 */
export function fetchCurrentAssets(page: Page): ResultAsync<DailyAsset[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const today = new Date();
      const dateStr = formatDate(today);

      log.debug({ url: MF_PORTFOLIO_URL, date: dateStr }, 'Fetching current assets');

      const response = await page.goto(MF_PORTFOLIO_URL, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });

      if (!response) {
        throw new Error('No response from portfolio endpoint');
      }

      const currentUrl = page.url();
      if (currentUrl.includes('/sign_in') || currentUrl.includes('/session')) {
        throw new Error('Session expired - redirected to login');
      }

      if (response.status() === 401 || response.status() === 403) {
        log.warn({ status: response.status() }, 'Portfolio access denied');
        return [];
      }

      // Check for 404 page
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('お探しのページは見つかりませんでした')) {
        log.warn('Portfolio page not found');
        return [];
      }

      // Wait for tables to load
      await page
        .waitForSelector('table.table-depo, table.table-bordered', {
          timeout: 10_000,
        })
        .catch(() => {
          log.debug('No asset table found on page');
        });

      // Parse asset data from tables
      const assets = await page.evaluate(() => {
        const results: Array<{
          assetType: string;
          balance: string;
          institutionName: string;
        }> = [];

        // Find all asset tables (table-depo contains the detailed data)
        const tables = Array.from(
          document.querySelectorAll('table.table-depo, table.table-bordered')
        );

        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tbody tr, tr'));

          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) continue;

            // Structure: asset type | balance | institution | (buttons...)
            const assetType = cells[0]?.textContent?.trim() || '';
            const balanceCell = cells[1];
            const institutionCell = cells[2];

            // Skip header rows or empty rows
            if (!assetType || !balanceCell) continue;

            const balance = balanceCell.textContent?.trim() || '';
            const institutionName = institutionCell?.textContent?.trim() || '';

            // Only include rows with valid balance data
            if (balance.includes('円') && institutionName) {
              results.push({ assetType, balance, institutionName });
            }
          }
        }

        return results;
      });

      const parsedAssets: DailyAsset[] = assets.map((a) => ({
        date: today,
        institutionName: a.institutionName,
        accountName: a.assetType, // Using asset type as account name
        assetType: categorizeAssetType(a.assetType),
        balance: parseYenAmount(a.balance),
      }));

      log.info({ count: parsedAssets.length, date: dateStr }, 'Fetched current assets');
      return parsedAssets;
    })(),
    (e) =>
      networkError(e instanceof Error ? e.message : 'Failed to fetch current assets', undefined, e)
  );
}

/**
 * Categorize asset type based on Japanese keywords
 */
function categorizeAssetType(name: string): string {
  if (name.includes('普通預金') || name.includes('円普通') || name.includes('円預金')) {
    return '預金';
  }
  if (name.includes('Suica') || name.includes('PASMO') || name.includes('キャッシュ')) {
    return '電子マネー';
  }
  if (name.includes('ポイント')) {
    return 'ポイント';
  }
  if (name.includes('証券') || name.includes('投資')) {
    return '投資';
  }
  if (name.includes('クレジット') || name.includes('カード')) {
    return 'クレジットカード';
  }
  return 'その他';
}

/**
 * Fetch recent daily assets - for now just fetches current snapshot
 */
export function fetchRecentDailyAssets(page: Page): ResultAsync<DailyAsset[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Fetching current asset snapshot');

      const result = await fetchCurrentAssets(page);
      if (result.isErr()) {
        throw new Error(result.error.message);
      }

      return result.value;
    })(),
    (e) =>
      parseError(
        e instanceof Error ? e.message : 'Failed to fetch recent daily assets',
        undefined,
        e
      )
  );
}

/**
 * Backfill daily assets - since we can only get current snapshot,
 * this just returns the current state
 */
export function backfillDailyAssets(
  page: Page,
  _hardStopDate?: Date
): ResultAsync<DailyAsset[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Fetching asset snapshot for backfill');

      const result = await fetchCurrentAssets(page);
      if (result.isErr()) {
        throw new Error(result.error.message);
      }

      log.info({ total: result.value.length }, 'Assets backfill complete');
      return result.value;
    })(),
    (e) =>
      parseError(e instanceof Error ? e.message : 'Failed to backfill daily assets', undefined, e)
  );
}

// Keep old function name for compatibility but delegate to new implementation
export const fetchDailyAssets = (_page: Page, _date: Date): ResultAsync<DailyAsset[], AppError> => {
  const log = getLogger();
  log.warn('fetchDailyAssets is deprecated - use fetchCurrentAssets instead');
  return fetchCurrentAssets(_page);
};
