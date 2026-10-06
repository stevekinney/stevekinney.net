import { maximumTokenCount } from './budget';

/**
 * Autocompact fires when the context reaches a threshold, so the margin is
 * whatever is left between that threshold and the end of the window.
 */

/** The point where automatic compaction fires, in tokens. */
export const thresholdTokens = (capacity: number, margin: number): number => capacity - margin;

/** The threshold as a share of the window, from 0 to 100. */
export const thresholdPercent = (capacity: number, margin: number): number =>
  capacity > 0 ? ((capacity - margin) / capacity) * 100 : 0;

/** The margin for a threshold given in tokens, or null if the threshold is outside the window. */
export const marginFromThreshold = (capacity: number, threshold: number): number | null =>
  threshold >= 0 && threshold <= capacity ? capacity - threshold : null;

/** The margin for a threshold given as a percentage, or null if it is outside 0 to 100. */
export const marginFromPercent = (capacity: number, percent: number): number | null =>
  percent >= 0 && percent <= 100 ? Math.round(capacity * (1 - percent / 100)) : null;

/**
 * The margin that keeps the same threshold percentage in a different window.
 * `marginShare` is the margin divided by the capacity it was set against.
 */
export const marginForCapacity = (capacity: number, marginShare: number): number =>
  Math.min(Math.round(capacity * marginShare), maximumTokenCount);

/** The margin as a share of a window, remembered so that resizing the window can keep it. */
export const marginShareOf = (capacity: number, margin: number): number =>
  capacity > 0 ? margin / capacity : 0;

/** Reads `90`, `90%`, or `87.5 %`. Returns null for anything else. */
export const parsePercent = (text: string): number | null => {
  const match = /^(\d+(?:\.\d*)?|\.\d+)\s*%?$/.exec(text.trim());

  return match ? Number(match[1]) : null;
};

/** A percentage without trailing zeros, such as `90` or `87.5`. */
export const formatThresholdPercent = (percent: number): string =>
  String(Math.round(percent * 10) / 10);
