import { TOKENS_PER_PRICE_UNIT } from './pricing';
import type { Rates } from './pricing';

/** Everything the projection needs. The page derives it from its one state object. */
export type ProjectionInputs = {
  /** The model you're on now. */
  rates: Rates;
  /** The model you might switch to, or null when there's nothing to switch to. */
  switchRates: Rates | null;
  /** Whether the cache is still warm right now. */
  warm: boolean;
  /** N: tokens of context now. */
  contextNow: number;
  /** The summary's size as a percentage of N. */
  summaryPercent: number;
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

export type StrategyId = 'keep' | 'compact' | 'switch';

export type Projection = {
  summaryTokens: number;
  parts: CompactParts;
  /** Cumulative dollars at turn 0 through T. Index 0 holds only the one-time cost. */
  keep: number[];
  compact: number[];
  /** Null when there's no other model to switch to. */
  switch: number[] | null;
  /** The one-time cost of re-writing the whole context to the destination model's cache. */
  switchCost: number;
  /** First turn where compacting costs no more than keeping going, or null. */
  compactCrossover: number | null;
  /** First turn where switching costs no more than keeping going, or null. */
  switchCrossover: number | null;
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
export const turnCost = (
  inputs: ProjectionInputs,
  prefix: number,
  cold = false,
  rates: Rates = inputs.rates,
): number => {
  const { inputPerTurn, outputPerTurn } = inputs;

  return dollars(
    prefix * (cold ? rates.write : rates.read) +
      (inputPerTurn + outputPerTurn) * rates.write +
      outputPerTurn * rates.output,
  );
};

/** The one-time cost of compacting the context now. */
export const compactParts = (inputs: ProjectionInputs): CompactParts => {
  const { rates, summaryPercent, baseline, contextNow, warm } = inputs;
  const summaryTokens = summaryTokensFor(contextNow, summaryPercent);
  const historyRate = warm ? rates.read : rates.input;

  return {
    summarize: dollars(contextNow * historyRate),
    generate: dollars(summaryTokens * rates.output),
    rebuild: dollars((baseline + summaryTokens) * rates.write),
    total: dollars(
      contextNow * historyRate +
        summaryTokens * rates.output +
        (baseline + summaryTokens) * rates.write,
    ),
    summaryTokens,
  };
};

/**
 * Cumulative spend after each turn, starting from `start` at index 0 with a
 * prefix of `firstPrefix` tokens that grows each turn. When `coldStart` is set
 * the first turn finds the cache expired.
 */
const accumulate = (
  inputs: ProjectionInputs,
  start: number,
  firstPrefix: number,
  coldStart = false,
  rates: Rates = inputs.rates,
): number[] => {
  const growth = growthPerTurn(inputs);
  const series = [start];

  for (let index = 0; index < inputs.turns; index += 1) {
    series.push(
      series[index] +
        turnCost(inputs, firstPrefix + index * growth, coldStart && index === 0, rates),
    );
  }

  return series;
};

/** The first turn where `b` costs no more than `a`, or null. */
export const crossover = (a: readonly number[], b: readonly number[]): number | null => {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (b[index] <= a[index] + TIE_TOLERANCE) return index;
  }

  return null;
};

/**
 * Keeping going, compacting now, and switching models now, turn by turn.
 * Switching writes the whole context to the destination model's cache once,
 * whether or not the current cache is warm, and every turn after that is
 * priced on the destination.
 */
export const project = (inputs: ProjectionInputs): Projection => {
  const { contextNow, baseline, switchRates } = inputs;
  const parts = compactParts(inputs);
  const keep = accumulate(inputs, 0, contextNow, !inputs.warm);
  const compact = accumulate(inputs, parts.total, baseline + parts.summaryTokens);
  const switchCost = switchRates ? dollars(contextNow * switchRates.write) : 0;
  const switched = switchRates
    ? accumulate(inputs, switchCost, contextNow, false, switchRates)
    : null;

  return {
    summaryTokens: parts.summaryTokens,
    parts,
    keep,
    compact,
    switch: switched,
    switchCost,
    compactCrossover: crossover(keep, compact),
    switchCrossover: switched ? crossover(keep, switched) : null,
    compactCannotPay: baseline + parts.summaryTokens >= contextNow,
  };
};

/** How far to look for a payback that falls past the turns being drawn. */
export const PAYBACK_HORIZON = 200;

/** The first turn each strategy pays for itself, looking past the chart when it has to. */
export const paybacks = (
  inputs: ProjectionInputs,
  projection: Projection,
): { compact: number | null; switch: number | null } => {
  const needsLonger =
    inputs.turns < PAYBACK_HORIZON &&
    (projection.compactCrossover === null ||
      (projection.switch !== null && projection.switchCrossover === null));
  const longer = needsLonger ? project({ ...inputs, turns: PAYBACK_HORIZON }) : projection;

  return {
    compact: projection.compactCrossover ?? longer.compactCrossover,
    switch: projection.switchCrossover ?? longer.switchCrossover,
  };
};
