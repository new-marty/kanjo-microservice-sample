import { chromium, type BrowserContext, type Page } from 'playwright';
import { ResultAsync, err, ok } from 'neverthrow';
import type { Config } from '../config.js';
import { hasGmailConfig } from '../config.js';
import { authError, type AppError } from '../errors.js';
import { getLogger } from '../logger.js';
import { getSession, saveSession } from '../db.js';
import { fetchOtpFromGmail } from '../otp/gmail.js';
import { promptOtpFromTty } from '../otp/bluebubbles.js';
import type { StorageState } from '../types.js';
import * as fs from 'fs/promises';

const MF_SIGNIN_URL = 'https://moneyforward.com/sign_in';
const MF_ACCOUNTS_URL = 'https://moneyforward.com/accounts';

interface SessionContext {
  context: BrowserContext;
  page: Page;
}

async function ensureUserDataDir(userDataDir: string): Promise<void> {
  try {
    await fs.mkdir(userDataDir, { recursive: true, mode: 0o700 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw e;
    }
  }
}

export function launchBrowser(config: Config): ResultAsync<SessionContext, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Launching browser...');

      await ensureUserDataDir(config.userDataDir);

      const context = await chromium.launchPersistentContext(config.userDataDir, {
        headless: true,
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo',
        viewport: { width: 1280, height: 720 },
        args: ['--disable-blink-features=AutomationControlled'],
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      log.debug('Browser launched successfully');
      return { context, page };
    })(),
    (e) => authError('Failed to launch browser', e)
  );
}

export function restoreSession(ctx: SessionContext): ResultAsync<boolean, AppError> {
  return getSession().andThen((session) => {
    if (!session) {
      return ok(false);
    }

    return ResultAsync.fromPromise(
      (async () => {
        const log = getLogger();
        log.info('Restoring session from database...');

        await ctx.context.addCookies(session.storageState.cookies);

        log.debug('Session restored');
        return true;
      })(),
      (e) => authError('Failed to restore session', e)
    );
  });
}

export function isLoggedIn(ctx: SessionContext): ResultAsync<boolean, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.debug('Checking login status...');

      const response = await ctx.page.goto(MF_ACCOUNTS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      if (!response) {
        return false;
      }

      const currentUrl = ctx.page.url();

      if (currentUrl.includes('/sign_in') || currentUrl.includes('/session')) {
        log.debug('Not logged in - redirected to login page');
        return false;
      }

      if (response.status() === 401 || response.status() === 403) {
        log.debug('Not logged in - auth error');
        return false;
      }

      log.debug('Logged in successfully');
      return true;
    })(),
    (e) => authError('Failed to check login status', e)
  );
}

async function submitEmail(page: Page, email: string): Promise<void> {
  const log = getLogger();
  log.debug('Submitting email...');

  await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('#submitto, button[type="submit"]').first().click();
  await page.waitForURL((url) => url.toString().includes('id.moneyforward.com'), {
    timeout: 60_000,
  });

  log.debug('Email submitted');
}

async function submitPassword(page: Page, password: string): Promise<void> {
  const log = getLogger();
  log.debug('Submitting password...');

  await page.waitForSelector('input[type="password"]', { timeout: 30_000 });
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('#submitto, button[type="submit"]').first().click();
  await page.waitForURL((url) => url.toString().includes('id.moneyforward.com'), {
    timeout: 60_000,
  });

  log.debug('Password submitted');
}

async function getOtpCode(config: Config): Promise<string> {
  const log = getLogger();

  if (hasGmailConfig(config)) {
    const result = await fetchOtpFromGmail(config);
    if (result.isOk()) {
      return result.value;
    }
    log.warn({ error: result.error }, 'Failed to fetch OTP from Gmail, falling back to TTY');
  } else {
    log.info('Gmail not configured, prompting for OTP via TTY');
  }

  const ttyResult = await promptOtpFromTty();
  if (ttyResult.isErr()) {
    throw new Error(ttyResult.error.message);
  }
  return ttyResult.value;
}

async function handleOtpVerification(page: Page, config: Config): Promise<void> {
  const log = getLogger();

  try {
    await page.waitForSelector('input[type="tel"], input[name*="otp"]', { timeout: 5_000 });
  } catch {
    log.debug('No OTP input found, skipping OTP step');
    return;
  }

  log.info('OTP verification required');

  const otpCode = await getOtpCode(config);

  await page.locator('input[type="tel"], input[name*="otp"]').first().fill(otpCode);
  await page.locator('#submitto, button[type="submit"]').first().click();

  // Wait for navigation away from OTP page
  try {
    await page.waitForURL(
      (url) => {
        const urlStr = url.toString();
        // Should navigate away from sign_in page
        return !urlStr.includes('/sign_in') || urlStr.includes('account_selector');
      },
      { timeout: 30_000 }
    );
    log.debug('OTP submitted successfully');
  } catch {
    // Check if we're still on OTP page (wrong code)
    const currentUrl = page.url();
    log.error({ currentUrl }, 'OTP submission may have failed');
    throw new Error('OTP verification failed - may be invalid or expired code');
  }
}

async function handleAccountSelection(page: Page): Promise<void> {
  const log = getLogger();

  const currentUrl = page.url();
  if (!currentUrl.includes('account_selector')) {
    log.debug('No account selection page, skipping');
    return;
  }

  log.debug('Account selection page detected, selecting first account');

  // Wait for the account selector buttons to load
  try {
    await page.waitForSelector('button[type="submit"], button.eOPB9ZFm, .account-item', {
      timeout: 10_000,
    });
  } catch {
    log.warn('No account selector buttons found');
    return;
  }

  // Try different selectors for the account button
  const accountButton = page.locator('button[type="submit"], button.eOPB9ZFm').first();
  await accountButton.click();

  // Wait for redirect away from account_selector
  await page.waitForURL((url) => !url.toString().includes('account_selector'), {
    timeout: 60_000,
  });

  log.debug('Account selected');
}

export function performLogin(ctx: SessionContext, config: Config): ResultAsync<void, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Performing login...');

      // Start login from moneyforward.com to initiate OAuth flow
      await ctx.page.goto(MF_SIGNIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // This will redirect to id.moneyforward.com for authentication
      await ctx.page.waitForURL((url) => url.toString().includes('id.moneyforward.com'), {
        timeout: 30_000,
      });

      await submitEmail(ctx.page, config.mfEmail);

      await submitPassword(ctx.page, config.mfPassword);

      await handleOtpVerification(ctx.page, config);

      // Handle account selection if shown
      await handleAccountSelection(ctx.page);

      // If still on id.moneyforward.com, navigate to complete the OAuth flow
      if (ctx.page.url().includes('id.moneyforward.com')) {
        log.debug('Navigating to moneyforward.com to complete OAuth flow');
        await ctx.page.goto(MF_ACCOUNTS_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Handle account selection again if redirected
        await handleAccountSelection(ctx.page);
      }

      // Wait until we're on moneyforward.com
      const currentUrl = ctx.page.url();
      if (currentUrl.includes('/sign_in') || currentUrl.includes('/session')) {
        throw new Error('Login failed - still on login page');
      }

      if (!currentUrl.includes('moneyforward.com') || currentUrl.includes('id.moneyforward.com')) {
        throw new Error(`Login failed - unexpected URL: ${currentUrl}`);
      }

      log.info('Login successful');
    })(),
    (e) => authError(e instanceof Error ? e.message : 'Login failed', e)
  );
}

export function persistSession(ctx: SessionContext): ResultAsync<void, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.debug('Persisting session...');

      const storageState = (await ctx.context.storageState()) as StorageState;
      await saveSession(storageState);

      log.debug('Session persisted to database');
    })(),
    (e) => authError('Failed to persist session', e)
  );
}

export function closeBrowser(ctx: SessionContext): ResultAsync<void, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.debug('Closing browser...');
      await ctx.context.close();
    })(),
    (e) => authError('Failed to close browser', e)
  );
}

export function withSession<T>(
  config: Config,
  fn: (ctx: SessionContext) => ResultAsync<T, AppError>
): ResultAsync<T, AppError> {
  return launchBrowser(config).andThen((ctx) =>
    restoreSession(ctx)
      .andThen((_restored) =>
        isLoggedIn(ctx).andThen((loggedIn) => {
          if (loggedIn) {
            return ok(undefined);
          }
          return performLogin(ctx, config);
        })
      )
      .andThen(() => fn(ctx))
      .andThen((result) => persistSession(ctx).map(() => result))
      .andThen((result) => closeBrowser(ctx).map(() => result))
      .orElse((error) => closeBrowser(ctx).andThen(() => err(error)))
  );
}
