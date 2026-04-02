import { CURRENCIES, DEFAULT_CURRENCY } from '../constants/currencies';

export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const config = CURRENCIES[currencyCode];
  if (!config) {
    return `${amount} ${currencyCode}`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return Number(cleaned);
}

/**
 * Format yen amount with thousands separator
 * @example formatYen(1234567) // "¥1,234,567"
 */
export function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format yen amount with explicit sign
 * @example formatYenSigned(-1234) // "-¥1,234"
 * @example formatYenSigned(1234) // "+¥1,234"
 */
export function formatYenSigned(amount: number): string {
  const formatted = formatYen(Math.abs(amount));
  if (amount > 0) {
    return `+${formatted}`;
  } else if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/**
 * Format yen amount in compact notation (万 for 10k+)
 * @example formatYenCompact(190000) // "¥19万"
 * @example formatYenCompact(1234567) // "¥123万"
 * @example formatYenCompact(9999) // "¥9,999"
 */
export function formatYenCompact(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 10000) {
    const man = Math.floor(absAmount / 10000);
    return `${sign}¥${man.toLocaleString('ja-JP')}万`;
  }

  return `${sign}${formatYen(absAmount)}`;
}
