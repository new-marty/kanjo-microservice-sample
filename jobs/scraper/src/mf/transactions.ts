import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { createHash } from 'crypto';
import { ResultAsync } from 'neverthrow';
import type { Page } from 'playwright';
import { networkError, parseError, type AppError } from '../errors.js';
import { getLogger } from '../logger.js';
import type { Transaction } from '../types.js';

const MF_CSV_URL = 'https://moneyforward.com/cf/csv';

interface CsvRow {
  [key: string]: string;
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[,¥円\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('/').map((s) => parseInt(s, 10));
  return new Date(year, month - 1, day);
}

function detectTransfer(description: string, memo: string | null): boolean {
  const transferKeywords = ['振替', '振込', 'ATM', '引き出し', '入金'];
  const text = `${description} ${memo || ''}`.toLowerCase();
  return transferKeywords.some((kw) => text.includes(kw));
}

export function generateTransactionHash(tx: {
  date: Date;
  amount: number;
  accountName: string;
  description: string;
}): string {
  const dateStr = tx.date.toISOString().split('T')[0];
  const data = `${dateStr}|${tx.amount}|${tx.accountName}|${tx.description}`;
  return createHash('sha256').update(data).digest('hex');
}

export function parseTransactionsCsv(csvBuffer: Buffer): Transaction[] {
  const log = getLogger();

  const decoded = iconv.decode(csvBuffer, 'CP932');

  const records = parse(decoded, {
    columns: true,
    skip_empty_lines: true,
    relaxColumnCount: true,
    trim: true,
  }) as CsvRow[];

  log.debug({ rowCount: records.length }, 'Parsed CSV rows');

  const transactions: Transaction[] = [];

  for (const row of records) {
    const dateValue = row['日付'];
    const amountValue = row['金額（円）'] || row['金額'];
    const accountValue = row['保有金融機関'];
    const categoryValue = row['大項目'];
    const subCategoryValue = row['中項目'];
    const descriptionValue = row['内容'];
    const memoValue = row['メモ'];
    const isTransferValue = row['振替'];

    if (!dateValue || !amountValue || !accountValue || !categoryValue || !descriptionValue) {
      log.debug({ row }, 'Skipping row with missing fields');
      continue;
    }

    const date = parseDate(dateValue);
    const amount = parseAmount(amountValue);
    const accountName = accountValue;
    const description = descriptionValue;
    const memo = memoValue || null;
    const subCategory = subCategoryValue || null;

    const isTransfer =
      isTransferValue === '1' || isTransferValue === 'true' || detectTransfer(description, memo);

    const tx: Transaction = {
      hash: '',
      date,
      description,
      amount,
      category: categoryValue,
      subCategory,
      accountName,
      memo,
      isTransfer,
      isRecurring: false,
    };

    tx.hash = generateTransactionHash(tx);
    transactions.push(tx);
  }

  log.info({ count: transactions.length }, 'Parsed transactions from CSV');
  return transactions;
}

function buildCsvUrl(year: number, month: number): string {
  const fromDate = `${year}/${String(month).padStart(2, '0')}/01`;
  return `${MF_CSV_URL}?from=${fromDate}&month=${month}&year=${year}`;
}

export function fetchTransactionsCsv(
  page: Page,
  year: number,
  month: number
): ResultAsync<Buffer, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const url = buildCsvUrl(year, month);
      log.debug({ url, year, month }, 'Fetching transactions CSV');

      const fs = await import('fs/promises');

      // Set up download handler before navigation
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });

      // Navigate - this may throw "Download is starting" error which is OK
      let response: Awaited<ReturnType<typeof page.goto>> = null;
      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
      } catch (e) {
        // "Download is starting" error is expected for CSV downloads
        const errorMessage = e instanceof Error ? e.message : '';
        if (!errorMessage.includes('Download is starting')) {
          throw e;
        }
        log.debug('Download triggered, waiting for file...');
      }

      // Check if we got redirected to login (session expired)
      const currentUrl = page.url();
      if (currentUrl.includes('/sign_in') || currentUrl.includes('/session')) {
        throw new Error('Session expired - redirected to login');
      }

      // If we got a direct response with CSV content, use it
      if (response) {
        if (response.status() === 401 || response.status() === 403) {
          throw new Error(`Auth error: ${response.status()}`);
        }

        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
          const buffer = await response.body();
          log.debug({ bytes: buffer.length }, 'Downloaded CSV directly');
          return buffer;
        }
      }

      // Wait for the download to complete
      try {
        const download = await downloadPromise;
        const path = await download.path();
        if (path) {
          const buffer = await fs.readFile(path);
          log.debug({ bytes: buffer.length }, 'Downloaded CSV via file');
          return buffer;
        }
      } catch (e) {
        log.debug({ error: e }, 'Download event failed');
      }

      // Last resort: try to get response body
      if (response) {
        const body = await response.body();
        if (body.length > 0) {
          log.debug({ bytes: body.length }, 'Using response body as CSV');
          return body;
        }
      }

      throw new Error('Failed to download CSV - no data received');
    })(),
    (e) =>
      networkError(
        e instanceof Error ? e.message : 'Failed to fetch transactions CSV',
        undefined,
        e
      )
  );
}

export function fetchTransactionsForMonths(
  page: Page,
  monthOffsets: number[]
): ResultAsync<Transaction[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const now = new Date();
      const allTransactions: Transaction[] = [];

      for (const offset of monthOffsets) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        log.info({ year, month }, 'Fetching transactions for month');

        const csvResult = await fetchTransactionsCsv(page, year, month);
        if (csvResult.isErr()) {
          log.warn({ error: csvResult.error, year, month }, 'Failed to fetch CSV for month');
          continue;
        }

        const transactions = parseTransactionsCsv(csvResult.value);
        allTransactions.push(...transactions);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const uniqueByHash = new Map<string, Transaction>();
      for (const tx of allTransactions) {
        uniqueByHash.set(tx.hash, tx);
      }

      return Array.from(uniqueByHash.values());
    })(),
    (e) => parseError(e instanceof Error ? e.message : 'Failed to fetch transactions', undefined, e)
  );
}

export function backfillTransactions(
  page: Page,
  hardStopDate?: Date
): ResultAsync<Transaction[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const now = new Date();
      const allTransactions: Transaction[] = [];
      let consecutiveEmpty = 0;
      let monthOffset = 0;

      log.info('Starting transaction backfill');

      while (consecutiveEmpty < 3) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        if (hardStopDate && targetDate < hardStopDate) {
          log.info({ hardStopDate }, 'Reached hard stop date, stopping backfill');
          break;
        }

        log.info({ year, month, offset: monthOffset }, 'Backfilling month');

        const csvResult = await fetchTransactionsCsv(page, year, month);
        if (csvResult.isErr()) {
          log.warn({ error: csvResult.error }, 'Failed to fetch CSV, counting as empty');
          consecutiveEmpty++;
          monthOffset++;
          continue;
        }

        const transactions = parseTransactionsCsv(csvResult.value);

        if (transactions.length === 0) {
          consecutiveEmpty++;
          log.debug({ consecutiveEmpty }, 'Empty month');
        } else {
          consecutiveEmpty = 0;
          allTransactions.push(...transactions);
          log.info({ count: transactions.length }, 'Found transactions');
        }

        monthOffset++;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const uniqueByHash = new Map<string, Transaction>();
      for (const tx of allTransactions) {
        uniqueByHash.set(tx.hash, tx);
      }

      log.info({ total: uniqueByHash.size }, 'Backfill complete');
      return Array.from(uniqueByHash.values());
    })(),
    (e) =>
      parseError(e instanceof Error ? e.message : 'Failed to backfill transactions', undefined, e)
  );
}
