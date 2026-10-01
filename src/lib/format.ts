import { getCurrency } from '@/constants/currencies';

export function currencySymbol(code: string) {
  return getCurrency(code).symbol;
}

export function formatMoney(amount: number, currency: string, opts?: { compact?: boolean }) {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      notation: opts?.compact ? 'compact' : 'standard',
      minimumFractionDigits: whole || opts?.compact ? 0 : 2,
      maximumFractionDigits: opts?.compact ? 1 : 2,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${amount.toFixed(whole ? 0 : 2)}`;
  }
}

/** Parses user input like "1,250.50" into a number; returns NaN when invalid. */
export function parseAmount(text: string) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return NaN;
  return Math.round(parseFloat(cleaned) * 100) / 100;
}

/** Keeps a decimal input to digits and at most one dot with two decimals. */
export function sanitizeAmountInput(text: string) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

// Dates are stored as local YYYY-MM-DD strings.

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function shiftDateKey(key: string, days: number) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDateKey(key: string, style: 'short' | 'long' = 'short') {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: style === 'long' ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: key.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  });
}

export function daysBetween(fromKey: string, toKey: string) {
  const ms = fromDateKey(toKey).getTime() - fromDateKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
