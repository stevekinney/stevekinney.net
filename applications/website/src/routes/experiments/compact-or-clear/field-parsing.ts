import { formatCompactTokenCount as formatTokens, parseTokenCount } from '$lib/experiments/format';

import { clamp, clampTo, ranges } from './scenario';
import type { NumberRange } from './scenario';

/** A token count from a text box, such as `400k`, `1m`, or `1,000,000`, held to the box's limits. */
export const parseTokenField = (text: string, range: NumberRange): number | null => {
  const count = parseTokenCount(text);

  return count === null ? null : clampTo(range, count);
};

/** A whole number of turns, held to the limits. */
export const parseTurnsField = (text: string): number | null => {
  const normalized = text.trim().replace(/,/g, '');
  if (!/^\d+$/.test(normalized)) return null;

  return clampTo(ranges.turns, Number(normalized));
};

/** Characters per token, which can be fractional. */
export const parseDecimalField = (text: string, range: NumberRange): number | null => {
  const normalized = text.trim();
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  return clampTo(range, Number(normalized));
};

/**
 * The summary box takes either a percentage or a token count. `5` and `5%`
 * are percentages. A number over 100 without a percent sign, or anything with
 * a `k` or `m`, is a token count, which becomes a percentage of the context.
 */
export const parseSummaryField = (text: string, contextNow: number): number | null => {
  // The box shows `20K (5%)`, so that has to read back as 5%.
  const shown = /\(([^)]*)\)\s*$/.exec(text.trim());
  const normalized = (shown ? shown[1] : text)
    .trim()
    .toLowerCase()
    .replace(/[\s,_]/g, '');
  const percentMatch = /^(\d+(?:\.\d*)?|\.\d+)%$/.exec(normalized);

  if (percentMatch) return clampTo(ranges.summaryPercent, Number(percentMatch[1]));

  if (/^(\d+(?:\.\d*)?|\.\d+)$/.test(normalized) && Number(normalized) <= 100) {
    return clampTo(ranges.summaryPercent, Number(normalized));
  }

  const tokens = parseTokenCount(normalized);
  if (tokens === null || tokens <= 0 || contextNow <= 0) return null;

  return clampTo(ranges.summaryPercent, roundPercent((tokens / contextNow) * 100));
};

export const roundPercent = (percent: number): number => Math.round(percent * 10) / 10;

/** `4.1`, or `5` without a trailing zero. */
export const formatPercent = (percent: number): string => `${roundPercent(percent)}%`;

/** The summary box's text: `20K (5%)`. */
export const formatSummary = (summaryTokens: number, percent: number): string =>
  `${formatTokens(summaryTokens)} (${formatPercent(percent)})`;

/** Where a slider rests for a value that may sit outside its range. */
export const sliderPosition = (range: NumberRange, value: number): number =>
  clamp(value, range.min, range.max);
