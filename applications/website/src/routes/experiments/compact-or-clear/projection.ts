import { TOKENS_PER_PRICE_UNIT } from './pricing';
import type { Rates } from './pricing';

/** Everything the projection needs. The page derives it from its one state object. */
export type ProjectionInputs = {
  rates: Rates;
  /** Whether the cache is still warm when you compact. */
  warm: boolean;
  /** N: tokens of context now. */
  contextNow: number;
  /** The summary's size as a percentage of N. */
  summaryPercent: number;
  /** E: tokens you deliberately re-read after a clear. */
  reread: number;
  /** gIn: input tokens each turn adds. */
  inputPerTurn: number;
  /** gOut: output tokens each turn adds. */
  outputPerTurn: number;
  /** T: how many turns to project. */
  turns: number;
  /** Tokens of system prompt, tools, and project context that every strategy carries. */
  baseline: number;
};

export type CompactParts = {
  /** Reading the history to summarize it. */
  summarize: number;
  /** Generating the summary. */
  generate: number;
  /** Rebuilding the cache around the shorter prefix. */
  rebuild: number;
  total: number;
  /** S, the summary's size in tokens. */
  summaryTokens: number;
};

export type StrategyId = 'keep' | 'compact' | 'clear' | 'later';

export type Projection = {
  summaryTokens: number;
  parts: CompactParts;
  clearOneTime: number;
  /** Cumulative dollars at turn 0 through T. Index 0 holds only the one-time cost. */
  keep: number[];
  compact: number[];
  clear: number[];
  /** Present when "compact later" is on. */
  later: number[] | null;
  /** First turn where compacting costs no more than keeping going, or null. */
  compactCrossover: number | null;
  clearCrossover: number | null;
  laterCrossover: number | null;
  /** A summary plus the baseline that's no smaller than the context now, so compacting can never pay. */
  compactCannotPay: boolean;
};

/** Two costs this close are the same cost. Keeps float noise from deciding a tie. */
const TIE_TOLERANCE = 1e-9;

const dollars = (tokenPrice: number): number => tokenPrice / TOKENS_PER_PRICE_UNIT;

export const summaryTokensFor = (contextNow: number, summaryPercent: number): number =>
  Math.round((contextNow * summaryPercent) / 100);

export const growthPerTurn = ({ inputPerTurn, outputPerTurn }: ProjectionInputs): number =>
  inputPerTurn + outputPerTurn;

/**
 * What one turn costs: re-read the prefix, write what's new, and generate the output. On a cold
 * turn the cache has expired, so the prefix is processed again and written back to the cache at
 * the write rate instead of being read. The cache is warm again after that turn.
 */
export const turnCost = (inputs: ProjectionInputs, prefix: number, cold = false): number => {
  const { rates, inputPerTurn, outputPerTurn } = inputs;

  return dollars(
    prefix * (cold ? rates.write : rates.read) +
      (inputPerTurn + outputPerTurn) * rates.write +
      outputPerTurn * rates.output,
  );
};

/** The one-time cost of compacting a context of `context` tokens. */
export const compactParts = (
  inputs: ProjectionInputs,
  context = inputs.contextNow,
  warm = inputs.warm,
): CompactParts => {
  const { rates, summaryPercent, baseline } = inputs;
  const summaryTokens = summaryTokensFor(context, summaryPercent);
  const summarize = dollars(context * (warm ? rates.read : rates.input));
  const generate = dollars(summaryTokens * rates.output);
  const rebuild = dollars((baseline + summaryTokens) * rates.write);

  return {
    summarize,
    generate,
    rebuild,
    total: dollars(
      context * (warm ? rates.read : rates.input) +
        summaryTokens * rates.output +
        (baseline + summaryTokens) * rates.write,
    ),
    summaryTokens,
  };
};

/** The one-time cost of clearing: rebuild the baseline and whatever you re-read. */
export const clearOneTime = (inputs: ProjectionInputs): number =>
  dollars((inputs.baseline + inputs.reread) * inputs.rates.write);

/**
 * Cumulative spend after each turn, starting from `start` at index 0 with a
 * prefix of `firstPrefix` tokens that grows by `growth` each turn. When
 * `coldStart` is set the first turn finds the cache expired.
 */
const accumulate = (
  inputs: ProjectionInputs,
  start: number,
  firstPrefix: number,
  length: number,
  coldStart = false,
): number[] => {
  const growth = growthPerTurn(inputs);
  const series = [start];

  for (let index = 0; index < length; index += 1) {
    series.push(
      series[index] + turnCost(inputs, firstPrefix + index * growth, coldStart && index === 0),
    );
  }

  return series;
};

/**
 * Compact after `k` turns instead of now. Until turn `k` it matches keeping
 * going. At index `k` it jumps by the cost of compacting the context as it
 * stands then, and from there it pays the compacted prefix's turn cost.
 * `k = 0` is compacting now.
 */
export const compactLaterSeries = (inputs: ProjectionInputs, k: number): number[] => {
  const { contextNow, baseline, turns } = inputs;
  const growth = growthPerTurn(inputs);
  const split = Math.max(0, Math.min(Math.floor(k), turns));
  const keep = accumulate(inputs, 0, contextNow, split, !inputs.warm);
  const compactedContext = contextNow + split * growth;
  // Turns before the compaction refresh the cache, so only compacting right now can find it cold.
  const parts = compactParts(inputs, compactedContext, inputs.warm || split > 0);
  const series = [...keep.slice(0, split), keep[split] + parts.total];

  for (let index = split; index < turns; index += 1) {
    series.push(
      series[index] + turnCost(inputs, baseline + parts.summaryTokens + (index - split) * growth),
    );
  }

  return series;
};

/**
 * The first turn from `from` on where `b` costs no more than `a`, or null.
 * `from` matters for compacting later, whose series equals keeping going
 * until the compaction and so would otherwise "cross over" at turn 0.
 */
export const crossover = (a: readonly number[], b: readonly number[], from = 0): number | null => {
  for (let index = from; index < Math.min(a.length, b.length); index += 1) {
    if (b[index] <= a[index] + TIE_TOLERANCE) return index;
  }

  return null;
};

export const project = (inputs: ProjectionInputs, laterAfter: number | null = null): Projection => {
  const { contextNow, baseline, reread, turns } = inputs;
  const parts = compactParts(inputs);
  const clearCost = clearOneTime(inputs);
  const keep = accumulate(inputs, 0, contextNow, turns, !inputs.warm);
  const compact = accumulate(inputs, parts.total, baseline + parts.summaryTokens, turns);
  const clear = accumulate(inputs, clearCost, baseline + reread, turns);
  const later = laterAfter === null ? null : compactLaterSeries(inputs, laterAfter);

  return {
    summaryTokens: parts.summaryTokens,
    parts,
    clearOneTime: clearCost,
    keep,
    compact,
    clear,
    later,
    compactCrossover: crossover(keep, compact),
    clearCrossover: crossover(keep, clear),
    laterCrossover: later && laterAfter !== null ? crossover(keep, later, laterAfter) : null,
    compactCannotPay: baseline + parts.summaryTokens >= contextNow,
  };
};

/** The first turn compacting pays for itself within `horizon` turns, without building the series. */
export const compactPayback = (inputs: ProjectionInputs, horizon: number): number | null => {
  const projection = project({ ...inputs, turns: horizon });

  return projection.compactCrossover;
};

const STRATEGY_ORDER: StrategyId[] = ['keep', 'compact', 'clear', 'later'];

/** The cheapest strategy at a turn. A tie goes to the earlier strategy in the list. */
export const bestAt = (projection: Projection, turn: number): StrategyId => {
  let best: StrategyId = 'keep';
  let bestCost = Infinity;

  for (const strategy of STRATEGY_ORDER) {
    const series = projection[strategy];
    if (!series) continue;

    if (series[turn] < bestCost - TIE_TOLERANCE) {
      best = strategy;
      bestCost = series[turn];
    }
  }

  return best;
};

/** Rows for the projected spend table: turns 1, 5, 10, 20, 30, 50, 80, and 120 up to T, plus T. */
export const tableTurns = (turns: number): number[] => {
  const marks = [1, 5, 10, 20, 30, 50, 80, 120].filter((turn) => turn <= turns);

  return marks.at(-1) === turns ? marks : [...marks, turns];
};
