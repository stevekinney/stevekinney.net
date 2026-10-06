import { formatCompactTokenCount as formatTokens, formatCost } from '$lib/experiments/format';

import type { Evaluation } from './economics';

/** A multiplier to two decimals, without trailing zeros: `1.82×`, `2.5×`, `1×`. */
export const formatMultiplier = (value: number): string => `${Number(value.toFixed(2))}×`;

/** Minutes to one decimal, without a trailing zero: `45`, `39.5`. */
export const formatMinuteCount = (minutes: number): string => String(Number(minutes.toFixed(1)));

export const formatMinutes = (minutes: number): string => `${formatMinuteCount(minutes)} min`;

/** A fraction such as 0.4 as `40%`. */
export const formatPercent = (fraction: number): string =>
  `${Number((fraction * 100).toFixed(1))}%`;

/** `45 min vs 60 solo (1.33× faster)`, or `73.5 min vs 60 solo (1.23× slower)`. */
export const wallClockText = (evaluation: Evaluation): string => {
  const { fanMinutes, soloMinutes, speedup } = evaluation;
  const comparison = `${formatMinutes(fanMinutes)} vs ${formatMinuteCount(soloMinutes)} solo`;

  if (speedup === null) return `${comparison} (no work to speed up)`;
  // With no solo time, integration alone makes it slower, by no finite multiple.
  if (evaluation.slower && soloMinutes === 0) return `${comparison} (slower)`;
  if (evaluation.slower)
    return `${comparison} (${formatMultiplier(fanMinutes / soloMinutes)} slower)`;
  if (formatMultiplier(speedup) === '1×') return `${comparison} (no faster)`;

  return `${comparison} (${formatMultiplier(speedup)} faster)`;
};

/** `608K vs 370K (1.64×)`. */
export const tokensText = (evaluation: Evaluation): string => {
  const { fan, solo, tokenMultiplier } = evaluation;
  const comparison = `${formatTokens(fan.total)} vs ${formatTokens(solo.total)}`;

  return tokenMultiplier === null
    ? comparison
    : `${comparison} (${formatMultiplier(tokenMultiplier)})`;
};

/** `$1.38 vs $0.90`. */
export const costText = (evaluation: Evaluation): string =>
  `${formatCost(evaluation.fanCost)} vs ${formatCost(evaluation.soloCost)}`;

/** The worker counts that tie for fastest, as `3 or 4`, `3, 4, or 5`, or `32`. */
export const formatWorkerList = (workers: readonly number[]): string => {
  if (workers.length <= 1) return String(workers[0] ?? 1);
  if (workers.length === 2) return `${workers[0]} or ${workers[1]}`;
  if (workers.length > 4) return `${workers[0]} to ${workers.at(-1)}`;

  return `${workers.slice(0, -1).join(', ')}, or ${workers.at(-1)}`;
};

const ORDINAL_WORDS = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

const ordinal = (value: number): string => {
  if (value < ORDINAL_WORDS.length) return ORDINAL_WORDS[value];

  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;

  return `${value}${{ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th'}`;
};

/**
 * Which worker count is fastest, in words. When counts tie, the extra workers
 * buy nothing, and the sentence says so.
 */
export const bestWorkersText = (evaluation: Evaluation): string => {
  const { best } = evaluation;
  const minutes = formatMinutes(best.minutes);

  if (best.tied.length === 32) {
    return 'Every worker count from 1 to 32 takes the same time, so adding workers buys nothing.';
  }
  if (best.tied.length > 1) {
    const extra = best.tied.slice(1).map(ordinal);
    const workers =
      extra.length === 1 ? `the ${extra[0]} worker buys` : `the ${extra.join(', ')} workers buy`;

    return `Fastest at ${formatWorkerList(best.tied)} workers (${minutes}): ${workers} nothing.`;
  }

  return `Fastest at ${best.workers} ${best.workers === 1 ? 'worker' : 'workers'} (${minutes}).`;
};
