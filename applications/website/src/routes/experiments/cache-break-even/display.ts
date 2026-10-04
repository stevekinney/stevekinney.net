import { formatCost } from '$lib/experiments/format';

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
});

/** Three significant digits, so 562,500 reads as `563K` and 1,250,000 as `1.25M`. */
export const formatTokens = (count: number): string => {
  if (count === Number.POSITIVE_INFINITY) return '∞';

  return compactFormatter.format(Math.max(0, Math.round(count)));
};

/** Anything under a hundred-millionth of a dollar is rounding noise, not a cost. */
const NOISE = 1e-9;

const clean = (dollars: number): number => (Math.abs(dollars) < NOISE ? 0 : dollars);

/** A dollar amount to the cent, such as `$2.00`. */
export const formatDollars = (dollars: number): string => formatCost(Math.abs(clean(dollars)));

/** A signed dollar amount, such as `+$0.25` or `−$0.25`. Zero is `+$0.00`. */
export const formatSignedDollars = (dollars: number): string => {
  const value = clean(dollars);

  return `${value < 0 ? '−' : '+'}${formatCost(Math.abs(value))}`;
};

/** A ratio to two decimals, such as `0.50`. */
export const formatRatio = (ratio: number): string => ratio.toFixed(2);

/** What a one-hour or five-minute TTL is called in prose. */
export const ttlLabel = (ttl: '5m' | '1h'): string => (ttl === '1h' ? '1-hour' : '5-minute');
