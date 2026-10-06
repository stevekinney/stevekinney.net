import { formatCompactTokenCount as formatTokens, parseTokenCount } from '$lib/experiments/format';

import { formatPercent } from './display';
import { clampTo } from './scenario';
import type { NumberRange } from './scenario';

/** A token count such as `50k`, `1.5M`, or `300,000`, held to the box's limits. Empty is zero. */
export const parseTokenField = (text: string, range: NumberRange): number | null => {
  const count = parseTokenCount(text);

  return count === null ? null : clampTo(range, count);
};

export const formatTokenField = (tokens: number): string => formatTokens(tokens);

/** A plain number such as `60`, `2.5`, or `3.5×`, held to the box's limits. Empty is the minimum. */
export const parseNumberField = (text: string, range: NumberRange): number | null => {
  const normalized = text
    .trim()
    .replace(/,/g, '')
    .replace(/\s*(×|x|min|minutes?)$/i, '');
  if (normalized === '') return range.typedMin;
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  return clampTo(range, Number(normalized));
};

/** A whole number of workers. */
export const parseWholeField = (text: string, range: NumberRange): number | null => {
  const parsed = parseNumberField(text, range);

  return parsed === null ? null : clampTo(range, Math.round(parsed));
};

/**
 * The serial fraction: `40%` and `40` are percentages, and `0.4` is a
 * fraction. A number above 1 without a percent sign is a percentage.
 */
export const parseFractionField = (text: string, range: NumberRange): number | null => {
  const normalized = text.trim().replace(/\s/g, '');
  if (normalized === '') return range.typedMin;

  const percent = /^(\d+(?:\.\d*)?|\.\d+)%$/.exec(normalized);
  if (percent) return clampTo(range, Number(percent[1]) / 100);
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);

  return clampTo(range, value > 1 ? value / 100 : value);
};

export const formatFractionField = (fraction: number): string => formatPercent(fraction);

export const formatNumberField = (value: number): string => String(Number(value.toFixed(2)));
