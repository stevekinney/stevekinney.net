import { outcomeIds } from './simulate';
import type { Tally } from './simulate';

/** The nearest-rank percentile of values sorted ascending: the smallest value at or above `share`. */
export const percentile = (sorted: ArrayLike<number>, share: number): number => {
  if (sorted.length === 0) return 0;

  const rank = Math.ceil(share * sorted.length);

  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
};

export type CostStatistics = {
  median: number;
  p95: number;
  maximum: number;
  mean: number;
};

export const costStatistics = (costs: ArrayLike<number>): CostStatistics => {
  const sorted = Float64Array.from(costs).sort();
  let sum = 0;
  for (const cost of sorted) sum += cost;

  return {
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    maximum: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    mean: sorted.length > 0 ? sum / sorted.length : 0,
  };
};

export type HistogramBin = {
  /** Inclusive lower edge in dollars. */
  from: number;
  /** Exclusive upper edge, except the last bin, which includes it. */
  to: number;
  count: number;
};

export type CostHistogram = {
  bins: HistogramBin[];
  /** Runs that hit the horizon. They get their own bin, apart from the axis. */
  runaway: { count: number; minimum: number; maximum: number };
  statistics: CostStatistics;
};

/** A round bin width near `span / target`: 1, 2, or 5 times a power of ten. */
export const niceStep = (span: number, target: number): number => {
  if (!(span > 0)) return 1;

  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;

  return factor * power;
};

const RUNAWAY = outcomeIds.indexOf('runaway');

/**
 * Bins total cost per run, keeping runaway runs out of the axis so a handful of
 * 2,000-iteration runs don't flatten everything else into one bar. The
 * statistics cover every run, runaway or not. `upTo` widens the axis to share
 * it with another histogram.
 */
export const costHistogram = (tally: Tally, target = 20, upTo = 0): CostHistogram => {
  const statistics = costStatistics(tally.costs.subarray(0, tally.runs));
  const settled: number[] = [];
  const runaway = { count: 0, minimum: Number.POSITIVE_INFINITY, maximum: 0 };

  for (let index = 0; index < tally.runs; index += 1) {
    const cost = tally.costs[index];

    if (tally.outcomeOf[index] === RUNAWAY) {
      runaway.count += 1;
      runaway.minimum = Math.min(runaway.minimum, cost);
      runaway.maximum = Math.max(runaway.maximum, cost);
    } else {
      settled.push(cost);
    }
  }
  if (runaway.count === 0) runaway.minimum = 0;

  let top = Math.max(0, upTo);
  for (const cost of settled) top = Math.max(top, cost);
  const step = niceStep(top, target);
  const count = Math.max(1, Math.floor(top / step) + 1);
  const bins: HistogramBin[] = Array.from({ length: count }, (_, index) => ({
    from: index * step,
    to: (index + 1) * step,
    count: 0,
  }));

  for (const cost of settled) {
    bins[Math.min(count - 1, Math.floor(cost / step + 1e-9))].count += 1;
  }

  return { bins, runaway, statistics };
};

/** The highest cost of any run that didn't run away, for sharing an axis between two histograms. */
export const settledMaximum = (tally: Tally): number => {
  let maximum = 0;

  for (let index = 0; index < tally.runs; index += 1) {
    if (tally.outcomeOf[index] !== RUNAWAY) maximum = Math.max(maximum, tally.costs[index]);
  }

  return maximum;
};
