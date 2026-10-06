/** A real minus sign, which lines up with digits where a hyphen doesn't. */
export const MINUS = '−';

/** Fixed decimals with a real minus sign, and never a negative zero. */
export const formatNumber = (value: number, decimals = 1): string => {
  if (!Number.isFinite(value)) return '—';

  const text = value.toFixed(decimals);

  return Number(text) === 0 ? (0).toFixed(decimals) : text.replace(/^-/, MINUS);
};

/**
 * How many decimals an interval needs: enough for three significant figures
 * of its width, so [−11.6, 26.0] keeps one and [3.83, 10.17] keeps two.
 */
export const intervalDecimals = (lower: number, upper: number): number => {
  const width = Math.abs(upper - lower);
  if (!(width > 0) || !Number.isFinite(width)) return 2;

  return Math.min(3, Math.max(0, 2 - Math.floor(Math.log10(width))));
};

/**
 * How many decimals a point estimate needs beside its interval: one fewer than
 * the interval, and at least one, so 7.2 sits in [−11.6, 26.0] and 7.0 in
 * [3.83, 10.17].
 */
export const differenceDecimals = (lower: number, upper: number): number =>
  Math.max(1, intervalDecimals(lower, upper) - 1);
