export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2 },
};

export const DEFAULT_CURRENCY = 'JPY';
