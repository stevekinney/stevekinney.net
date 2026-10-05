import { formatCost } from '$lib/experiments/format';

/** A real minus sign, which lines up with digits where a hyphen doesn't. */
export const MINUS = '−';

const withMinus = (text: string): string => text.replace(/^-/, MINUS);

/** Fixed decimals with a real minus sign, and never a negative zero. */
export const formatNumber = (value: number, decimals = 1): string => {
  if (!Number.isFinite(value)) return '—';

  const text = value.toFixed(decimals);

  return Number(text) === 0 ? (0).toFixed(decimals) : withMinus(text);
};

/** Thousands separators for counts, such as 10,000. */
export const formatCount = (value: number): string => value.toLocaleString('en-US');

/**
 * How many decimals an interval needs: enough for three significant figures
 * of its width, so [−11.6, 26.0] keeps one and [3.83, 10.17] keeps two.
 */
export const intervalDecimals = (lower: number, upper: number): number => {
  const width = Math.abs(upper - lower);
  if (!(width > 0) || !Number.isFinite(width)) return 2;

  return Math.min(3, Math.max(0, 2 - Math.floor(Math.log10(width))));
};

/** A p-value: three decimals, four below 0.01, and “< 0.001” below that. */
export const formatP = (p: number | null): string => {
  if (p === null || !Number.isFinite(p)) return '—';
  if (p < 0.001) return '< 0.001';
  if (p < 0.01) return p.toFixed(4);

  return p.toFixed(3);
};

/** A percentage with one decimal, such as 15.0%. */
export const formatPercent = (value: number, decimals = 1): string =>
  `${formatNumber(value, decimals)}%`;

/** A rate from 0 to 1 as a percentage. */
export const formatRate = (rate: number): string => formatPercent(rate * 100);

/** An interval as `[low, high]`. */
export const formatInterval = (lower: number, upper: number, decimals: number): string =>
  `[${formatNumber(lower, decimals)}, ${formatNumber(upper, decimals)}]`;

/** Dollars, through the shared cost formatter, with a real minus sign for a negative amount. */
export const formatDollars = (value: number): string => {
  if (!Number.isFinite(value)) return '—';

  return value < 0 ? `${MINUS}${formatCost(-value)}` : formatCost(value);
};
