import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) {
        return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), key);
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));
