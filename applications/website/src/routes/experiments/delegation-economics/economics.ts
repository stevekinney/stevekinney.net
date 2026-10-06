/**
 * The calculation core: wall-clock time, token volume, and dollars for doing a
 * task in one session or fanning it out to `n` workers. Every function here is
 * pure. Money is `tokens × price` summed first and divided by a million once.
 */

import { TOKENS_PER_PRICE_UNIT } from './pricing';

/** The most workers the page models, and the right end of the speedup chart. */
export const MAXIMUM_WORKERS = 32;

export type Prices = { input: number; output: number };

export type EconomicsInputs = {
  /** W: how long the task takes in one session, in minutes. */
  soloMinutes: number;
  /** s: the share of the work that can't run in parallel, from 0 to 1. */
  serialFraction: number;
  /** n: how many workers. One worker is the solo session. */
  workers: number;
  /** I: minutes the coordinator spends reading and reconciling each worker's report. */
  integrationMinutes: number;
  /** C: context every worker has to read. */
  sharedTokens: number;
  /** Tokens each worker costs before it does any work. */
  spawnTokens: number;
  /** U: input unique to the work, split evenly across workers. */
  uniqueTokens: number;
  /** O: output each worker writes. */
  outputTokens: number;
  /** R: the report each worker returns, which the coordinator reads. */
  reportTokens: number;
  prices: Prices;
};

export type Tokens = { input: number; output: number; total: number };

export type BestWorkers = {
  /** The fewest workers that reach the shortest time. */
  workers: number;
  /** Every worker count that ties for the shortest time, fewest first. */
  tied: number[];
  minutes: number;
};

export type Evaluation = {
  workers: number;
  soloMinutes: number;
  fanMinutes: number;
  /** `W / time(n)`, or null when both are zero. */
  speedup: number | null;
  /** `1 / s`, the speedup no number of workers can beat, or null when nothing is serial. */
  ceiling: number | null;
  best: BestWorkers;
  solo: Tokens;
  fan: Tokens;
  /** Fan-out tokens over solo tokens, or null when the solo session uses none. */
  tokenMultiplier: number | null;
  soloCost: number;
  fanCost: number;
  costMultiplier: number | null;
  /** The fan-out finishes after the solo session would. */
  slower: boolean;
};

/** Floating-point slack for comparing minutes, so 36.00000000000001 ties with 36. */
const EPSILON = 1e-9;

const nonNegative = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

const clampFraction = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const wholeWorkers = (value: number): number =>
  Number.isFinite(value) ? Math.min(MAXIMUM_WORKERS, Math.max(1, Math.round(value))) : 1;

const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

/** Amdahl's law: the best speedup `n` workers can get when a fraction `s` is serial. */
export const amdahl = (serialFraction: number, workers: number): number => {
  const s = clampFraction(serialFraction);

  return 1 / (s + (1 - s) / Math.max(1, workers));
};

/** The speedup no number of workers can beat, `1 / s`, or null when nothing is serial. */
export const speedupCeiling = (serialFraction: number): number | null => {
  const s = clampFraction(serialFraction);

  return s > 0 ? 1 / s : null;
};

/**
 * `time(n) = W × (s + (1 − s)/n) + I × n`. One worker is the solo session: `W`,
 * with nothing to integrate.
 */
export const wallClockMinutes = (
  soloMinutes: number,
  serialFraction: number,
  integrationMinutes: number,
  workers: number,
): number => {
  const W = nonNegative(soloMinutes);
  const n = wholeWorkers(workers);
  if (n === 1) return W;

  const s = clampFraction(serialFraction);

  return W * (s + (1 - s) / n) + nonNegative(integrationMinutes) * n;
};

/** The worker count from 1 to 32 with the shortest time, and every count that ties with it. */
export const bestWorkers = (
  soloMinutes: number,
  serialFraction: number,
  integrationMinutes: number,
): BestWorkers => {
  const times = Array.from({ length: MAXIMUM_WORKERS }, (_, index) =>
    wallClockMinutes(soloMinutes, serialFraction, integrationMinutes, index + 1),
  );
  const minutes = Math.min(...times);
  const tied = times.flatMap((time, index) =>
    time - minutes <= EPSILON * Math.max(1, minutes) ? [index + 1] : [],
  );

  return { workers: tied[0], tied, minutes };
};

const tokens = (input: number, output: number): Tokens => ({
  input,
  output,
  total: input + output,
});

/** One session reads the shared context and the unique work once: `C + U` in, `n × O` out. */
export const soloTokens = (inputs: EconomicsInputs): Tokens =>
  tokens(
    nonNegative(inputs.sharedTokens) + nonNegative(inputs.uniqueTokens),
    wholeWorkers(inputs.workers) * nonNegative(inputs.outputTokens),
  );

/**
 * Fanned out: `n × (spawn + C) + U + n × R` in, `n × O` out. Every worker reads
 * the shared context for itself. One worker is the solo session.
 */
export const fanTokens = (inputs: EconomicsInputs): Tokens => {
  const n = wholeWorkers(inputs.workers);
  if (n === 1) return soloTokens(inputs);

  return tokens(
    n * (nonNegative(inputs.spawnTokens) + nonNegative(inputs.sharedTokens)) +
      nonNegative(inputs.uniqueTokens) +
      n * nonNegative(inputs.reportTokens),
    n * nonNegative(inputs.outputTokens),
  );
};

/** Dollars for some tokens, summed in tokens × dollars before dividing by a million. */
export const dollars = (count: Tokens, prices: Prices): number =>
  (count.input * prices.input + count.output * prices.output) / TOKENS_PER_PRICE_UNIT;

export const evaluate = (inputs: EconomicsInputs): Evaluation => {
  const workers = wholeWorkers(inputs.workers);
  const W = nonNegative(inputs.soloMinutes);
  const fanMinutes = wallClockMinutes(W, inputs.serialFraction, inputs.integrationMinutes, workers);
  const solo = soloTokens(inputs);
  const fan = fanTokens(inputs);
  const soloCost = dollars(solo, inputs.prices);
  const fanCost = dollars(fan, inputs.prices);

  return {
    workers,
    soloMinutes: W,
    fanMinutes,
    speedup: ratio(W, fanMinutes),
    ceiling: speedupCeiling(inputs.serialFraction),
    best: bestWorkers(W, inputs.serialFraction, inputs.integrationMinutes),
    solo,
    fan,
    tokenMultiplier: ratio(fan.total, solo.total),
    soloCost,
    fanCost,
    costMultiplier: ratio(fanCost, soloCost),
    slower: fanMinutes > W + EPSILON,
  };
};

export type CurvePoint = {
  workers: number;
  /** Amdahl's bound, with no integration. */
  ideal: number;
  /** `W / time(n)`, or null when both are zero. */
  speedup: number | null;
  minutes: number;
  tokens: number;
  cost: number;
};

/** Every worker count from 1 to 32, for the speedup chart and its table. */
export const speedupCurve = (inputs: EconomicsInputs): CurvePoint[] =>
  Array.from({ length: MAXIMUM_WORKERS }, (_, index) => {
    const at = { ...inputs, workers: index + 1 };
    const minutes = wallClockMinutes(
      inputs.soloMinutes,
      inputs.serialFraction,
      inputs.integrationMinutes,
      index + 1,
    );
    const fan = fanTokens(at);

    return {
      workers: index + 1,
      ideal: amdahl(inputs.serialFraction, index + 1),
      speedup: ratio(nonNegative(inputs.soloMinutes), minutes),
      minutes,
      tokens: fan.total,
      cost: dollars(fan, inputs.prices),
    };
  });
