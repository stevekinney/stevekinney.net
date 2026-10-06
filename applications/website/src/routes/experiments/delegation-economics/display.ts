import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

import type { Evaluation } from './economics';

/** A multiplier to two decimals, without trailing zeros: `1.82×`, `2.5×`, `1×`. */
export const formatMultiplier = (value: number): string => `${Number(value.toFixed(2))}×`;

/** Minutes to one decimal, without a trailing zero: `45`, `39.5`. */
export const formatMinuteCount = (minutes: number): string => String(Number(minutes.toFixed(1)));

export const formatMinutes = (minutes: number): string => `${formatMinuteCount(minutes)} min`;

/** A fraction such as 0.4 as `40%`. */
export const formatPercent = (fraction: number): string =>
  `${Number((fraction * 100).toFixed(1))}%`;

const speedText = (evaluation: Evaluation): string => {
  const { fanMinutes, soloMinutes, speedup, slower } = evaluation;

  // With no solo time, integration alone makes it slower, by no finite multiple.
  if (slower)
    return soloMinutes === 0 ? 'slower' : `${formatMultiplier(fanMinutes / soloMinutes)} slower`;
  if (speedup === null || formatMultiplier(speedup) === '1×') return 'no faster';

  return `${formatMultiplier(speedup)} faster`;
};

/** The answer in one line: `4 workers: 1.33× faster, 1.53× the cost`. */
export const answerText = (evaluation: Evaluation): string => {
  if (evaluation.workers === 1) return '1 worker is just the solo session.';
  if (evaluation.speedup === null && !evaluation.slower) return 'There’s no work to speed up.';

  const cost =
    evaluation.costMultiplier === null
      ? ''
      : `, ${formatMultiplier(evaluation.costMultiplier)} the cost`;

  return `${evaluation.workers} workers: ${speedText(evaluation)}${cost}`;
};

/** `45 min instead of 60, and 608K tokens instead of 370K.` */
export const detailText = (evaluation: Evaluation): string =>
  `${formatMinutes(evaluation.fanMinutes)} instead of ${formatMinuteCount(evaluation.soloMinutes)}, and ${formatTokens(evaluation.fan.total)} tokens instead of ${formatTokens(evaluation.solo.total)}.`;

/** The worker counts that tie for fastest, as `3 or 4`, `3, 4, or 5`, or `32`. */
export const formatWorkerList = (workers: readonly number[]): string => {
  if (workers.length <= 1) return String(workers[0] ?? 1);
  if (workers.length === 2) return `${workers[0]} or ${workers[1]}`;
  if (workers.length > 4) return `${workers[0]} to ${workers.at(-1)}`;

  return `${workers.slice(0, -1).join(', ')}, or ${workers.at(-1)}`;
};

/** Which worker count is fastest, in words, and the ceiling no worker count can pass. */
export const bestWorkersText = (evaluation: Evaluation): string => {
  const { best, ceiling } = evaluation;
  const limit =
    ceiling === null
      ? 'With no serial work, there’s no ceiling.'
      : `However many workers you add, it’s never faster than ${formatMultiplier(ceiling)}.`;

  if (best.tied.length === 32) {
    return 'Every worker count from 1 to 32 takes the same time, so adding workers buys nothing.';
  }

  const count = formatWorkerList(best.tied);
  const noun = best.tied.length === 1 && best.workers === 1 ? 'worker' : 'workers';

  return `Fastest at ${count} ${noun} (${formatMinutes(best.minutes)}). ${limit}`;
};
