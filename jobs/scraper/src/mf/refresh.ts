import { ResultAsync } from 'neverthrow';
import type { Page } from 'playwright';
import type { Config } from '../config.js';
import { hasBlueBubblesConfig } from '../config.js';
import { networkError, type AppError } from '../errors.js';
import { getLogger } from '../logger.js';
import { fetchOtpFromBlueBubbles, promptOtpFromTty } from '../otp/bluebubbles.js';

const MF_ACCOUNTS_URL = 'https://moneyforward.com/accounts';
const REFRESH_WAIT_MS = 5000;
const REFRESH_TIMEOUT_MS = 120_000;

interface RefreshStatus {
  accountId: string;
  name: string;
  status: 'pending' | 'refreshing' | 'completed' | 'failed' | 'otp_required';
}

async function getAccountsStatus(page: Page): Promise<RefreshStatus[]> {
  return page.evaluate(() => {
    const accounts: Array<{
      accountId: string;
      name: string;
      status: string;
    }> = [];

    // Account rows are tr elements with id attributes in #account-table
    const table = document.querySelector('#account-table');
    if (!table) return accounts;

    const rows = Array.from(table.querySelectorAll('tr[id]'));

    for (const row of rows) {
      const accountId = row.id;
      if (!accountId) continue;

      // First cell contains the service name
      const serviceEl = row.querySelector('.service, td:first-child');
      const name = serviceEl?.textContent?.trim().split('\n')[0] || '';

      // Status cell has class "account-status"
      const statusEl = row.querySelector('.account-status, .status');
      const statusText = statusEl?.textContent?.trim().toLowerCase() || '';

      // Also check the full row text for status indicators (some accounts like Matsui Securities
      // show OTP requirement text elsewhere in the row, not in the status cell)
      const fullRowText = row.textContent?.toLowerCase() || '';

      let status: string;
      if (statusText.includes('更新中') || fullRowText.includes('更新中')) {
        status = 'refreshing';
      } else if (
        statusText.includes('認証') ||
        statusText.includes('追加認証') ||
        statusText.includes('ログイン') ||
        statusText.includes('ワンタイムパスワード') ||
        fullRowText.includes('要ワンタイムパスワード') ||
        fullRowText.includes('追加認証')
      ) {
        status = 'otp_required';
      } else if (statusText.includes('失敗') || statusText.includes('エラー')) {
        status = 'failed';
      } else if (statusText.includes('正常') || statusText.includes('完了')) {
        status = 'completed';
      } else {
        status = 'pending';
      }

      accounts.push({ accountId, name, status });
    }

    return accounts;
  }) as Promise<RefreshStatus[]>;
}

async function clickRefreshButton(page: Page, accountId?: string): Promise<boolean> {
  const log = getLogger();

  if (accountId) {
    // Try to find refresh button for specific account
    const selector = `tr[id="${accountId}"] .btn, tr[id="${accountId}"] button`;
    const button = await page.$(selector);
    if (button) {
      await button.click();
      log.debug({ accountId }, 'Clicked refresh for specific account');
      return true;
    }
  }

  // Global refresh button: "金融機関からのデータ一括更新"
  const globalRefresh = await page.$(
    'a.btn.btn-warning, a:has-text("一括更新"), a:has-text("データ一括更新")'
  );
  if (globalRefresh) {
    await globalRefresh.click();
    log.debug('Clicked global refresh button');
    return true;
  }

  return false;
}

async function handleOtpInput(page: Page, config: Config): Promise<boolean> {
  const log = getLogger();

  // Wait for any loading indicators to disappear first
  try {
    await page.waitForFunction(
      () => {
        const loadingText = document.body.textContent || '';
        return !loadingText.includes('更新中') && !loadingText.includes('お待ち');
      },
      { timeout: 30000 }
    );
  } catch {
    log.debug('Loading wait timed out, continuing...');
  }

  await page.waitForTimeout(2000);

  // Check for OTP input fields (various possible selectors)
  const otpInput = await page.$(
    'input[type="tel"], input[type="text"]:not([type="hidden"]), input[name*="otp"], input[name*="code"], ' +
      'input[name*="password"]:not([autocomplete="current-password"]), input.otp-input, ' +
      'input[placeholder*="認証"], input[placeholder*="コード"], input[autocomplete="one-time-code"]'
  );
  if (!otpInput) {
    return false;
  }

  log.info('OTP input detected for account refresh - waiting for SMS');

  let otpCode: string;

  if (hasBlueBubblesConfig(config)) {
    log.info('Fetching OTP from BlueBubbles (SMS)...');
    const result = await fetchOtpFromBlueBubbles(config);
    if (result.isErr()) {
      log.warn(
        { error: result.error },
        'Failed to fetch OTP from BlueBubbles, falling back to TTY'
      );
      const ttyResult = await promptOtpFromTty();
      if (ttyResult.isErr()) {
        throw new Error(ttyResult.error.message);
      }
      otpCode = ttyResult.value;
    } else {
      otpCode = result.value;
      log.info({ code: otpCode }, 'Got OTP code from BlueBubbles');
    }
  } else {
    log.info('BlueBubbles not configured, prompting for OTP via TTY');
    const ttyResult = await promptOtpFromTty();
    if (ttyResult.isErr()) {
      throw new Error(ttyResult.error.message);
    }
    otpCode = ttyResult.value;
  }

  await otpInput.fill(otpCode);
  log.debug('Filled OTP input');

  // Try various submit button selectors
  const submitButton = await page.$(
    'button[type="submit"], input[type="submit"], button:has-text("送信"), ' +
      'button:has-text("認証"), button:has-text("確認"), button.btn-primary'
  );
  if (submitButton) {
    await submitButton.click();
    log.debug('Clicked submit button');
  }

  await page.waitForTimeout(5000);
  return true;
}

async function waitForRefreshComplete(
  page: Page,
  config: Config,
  accountIds?: string[]
): Promise<number> {
  const log = getLogger();
  const startTime = Date.now();
  let completedCount = 0;

  while (Date.now() - startTime < REFRESH_TIMEOUT_MS) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const handledOtp = await handleOtpInput(page, config);
    if (handledOtp) {
      log.info('Handled OTP input during refresh');
      continue;
    }

    const statuses = await getAccountsStatus(page);

    const targetAccounts = accountIds
      ? statuses.filter((s) => accountIds.includes(s.accountId))
      : statuses;

    const refreshing = targetAccounts.filter((s) => s.status === 'refreshing');
    const otpRequired = targetAccounts.filter((s) => s.status === 'otp_required');
    const completed = targetAccounts.filter((s) => s.status === 'completed');

    log.debug(
      {
        refreshing: refreshing.length,
        otpRequired: otpRequired.length,
        completed: completed.length,
        total: targetAccounts.length,
      },
      'Refresh status'
    );

    if (otpRequired.length > 0) {
      log.info({ accounts: otpRequired.map((a) => a.name) }, 'Accounts require OTP');

      for (const account of otpRequired) {
        // Find the account row by its id attribute using attribute selector
        const accountRow = await page.$(`tr[id="${account.accountId}"]`);
        if (accountRow) {
          // Look for a link or button to handle OTP (usually "ワンタイムパスワード" link)
          const otpLink = await accountRow.$(
            'a:has-text("ワンタイムパスワード"), a:has-text("認証"), button:has-text("認証")'
          );
          if (otpLink) {
            await otpLink.click();
            log.info({ account: account.name }, 'Clicked OTP link for account');
            // handleOtpInput will wait for loading to complete
            const handled = await handleOtpInput(page, config);
            if (handled) {
              log.info({ account: account.name }, 'OTP submitted successfully');
              // Navigate back to accounts page to continue checking
              await page.goto(MF_ACCOUNTS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
            }
          } else {
            // If no specific link, try clicking the row itself
            await accountRow.click();
            await page.waitForTimeout(1000);
            await handleOtpInput(page, config);
          }
        }
      }
    }

    if (refreshing.length === 0 && otpRequired.length === 0) {
      completedCount = completed.length;
      log.info({ completedCount }, 'All accounts finished refreshing');
      break;
    }

    await page.waitForTimeout(REFRESH_WAIT_MS);
  }

  return completedCount;
}

export function kickGlobalRefresh(page: Page, config: Config): ResultAsync<number, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Starting global account refresh');

      await page.goto(MF_ACCOUNTS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      const currentUrl = page.url();
      if (currentUrl.includes('/sign_in') || currentUrl.includes('/session')) {
        throw new Error('Session expired - redirected to login');
      }

      const clicked = await clickRefreshButton(page);
      if (!clicked) {
        log.warn('Could not find refresh button');
        return 0;
      }

      await page.waitForTimeout(3000);

      const completedCount = await waitForRefreshComplete(page, config);

      log.info({ completedCount }, 'Refresh complete');
      return completedCount;
    })(),
    (e) =>
      networkError(e instanceof Error ? e.message : 'Failed to kick global refresh', undefined, e)
  );
}

export function refreshAccounts(
  page: Page,
  config: Config,
  accountIds: string[]
): ResultAsync<number, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info({ accountIds }, 'Starting targeted account refresh');

      await page.goto(MF_ACCOUNTS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      let clickedCount = 0;
      for (const accountId of accountIds) {
        const clicked = await clickRefreshButton(page, accountId);
        if (clicked) {
          clickedCount++;
          await page.waitForTimeout(1000);
        }
      }

      if (clickedCount === 0) {
        log.warn('Could not find any refresh buttons for specified accounts');
        return 0;
      }

      const completedCount = await waitForRefreshComplete(page, config, accountIds);

      log.info({ completedCount }, 'Targeted refresh complete');
      return completedCount;
    })(),
    (e) => networkError(e instanceof Error ? e.message : 'Failed to refresh accounts', undefined, e)
  );
}
