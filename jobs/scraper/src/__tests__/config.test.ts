import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, mask, hasGmailConfig, hasBlueBubblesConfig } from '../config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid config from environment', () => {
    process.env.MF_EMAIL = 'test@example.com';
    process.env.MF_PASSWORD = 'password123';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const result = loadConfig();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.mfEmail).toBe('test@example.com');
      expect(result.value.mfPassword).toBe('password123');
      expect(result.value.databaseUrl).toBe('postgresql://user:pass@localhost:5432/db');
    }
  });

  it('returns error for missing required fields', () => {
    process.env.MF_EMAIL = 'test@example.com';

    const result = loadConfig();

    expect(result.isErr()).toBe(true);
  });

  it('uses default values for optional fields', () => {
    process.env.MF_EMAIL = 'test@example.com';
    process.env.MF_PASSWORD = 'password123';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const result = loadConfig();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.userDataDir).toBe('.mf-user-data');
      expect(result.value.csvMonths).toEqual([0, 1]);
      expect(result.value.logLevel).toBe('info');
    }
  });

  it('parses CSV months from environment', () => {
    process.env.MF_EMAIL = 'test@example.com';
    process.env.MF_PASSWORD = 'password123';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MF_CSV_MONTHS = '0,1,2,3';

    const result = loadConfig();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.csvMonths).toEqual([0, 1, 2, 3]);
    }
  });

  it('parses refresh account IDs from environment', () => {
    process.env.MF_EMAIL = 'test@example.com';
    process.env.MF_PASSWORD = 'password123';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MF_REFRESH_ACCOUNT_IDS = 'acc1,acc2,acc3';

    const result = loadConfig();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.refreshAccountIds).toEqual(['acc1', 'acc2', 'acc3']);
    }
  });
});

describe('mask', () => {
  it('masks strings longer than 4 characters', () => {
    expect(mask('password123')).toBe('****d123');
    expect(mask('secretkey')).toBe('****tkey');
  });

  it('returns **** for short strings', () => {
    expect(mask('abc')).toBe('****');
    expect(mask('ab')).toBe('****');
  });
});

describe('hasGmailConfig', () => {
  it('returns true when both Gmail fields are set', () => {
    const config = {
      mfEmail: 'test@example.com',
      mfPassword: 'pass',
      databaseUrl: 'postgresql://localhost/db',
      userDataDir: '.data',
      csvMonths: [0, 1],
      logLevel: 'info' as const,
      gmailUser: 'gmail@gmail.com',
      gmailAppPassword: 'app-password',
    };

    expect(hasGmailConfig(config)).toBe(true);
  });

  it('returns false when Gmail fields are missing', () => {
    const config = {
      mfEmail: 'test@example.com',
      mfPassword: 'pass',
      databaseUrl: 'postgresql://localhost/db',
      userDataDir: '.data',
      csvMonths: [0, 1],
      logLevel: 'info' as const,
    };

    expect(hasGmailConfig(config)).toBe(false);
  });
});

describe('hasBlueBubblesConfig', () => {
  it('returns true when both BlueBubbles fields are set', () => {
    const config = {
      mfEmail: 'test@example.com',
      mfPassword: 'pass',
      databaseUrl: 'postgresql://localhost/db',
      userDataDir: '.data',
      csvMonths: [0, 1],
      logLevel: 'info' as const,
      blueBubblesUrl: 'https://example.com',
      blueBubblesPassword: 'password',
    };

    expect(hasBlueBubblesConfig(config)).toBe(true);
  });

  it('returns false when BlueBubbles fields are missing', () => {
    const config = {
      mfEmail: 'test@example.com',
      mfPassword: 'pass',
      databaseUrl: 'postgresql://localhost/db',
      userDataDir: '.data',
      csvMonths: [0, 1],
      logLevel: 'info' as const,
    };

    expect(hasBlueBubblesConfig(config)).toBe(false);
  });
});
