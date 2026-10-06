/**
 * The calculation core: wall-clock time, token volume, and dollars for doing a
 * task in one session or fanning it out to `n` workers. Every function here is
 * pure. Money is `tokens × price` summed first and divided by a million once.
 */

import { TOKENS_PER_PRICE_UNIT } from './pricing';

/** The most workers the page models, and the right end of the speedup chart. */
export const MAXIMUM_WORKERS = 32;

/** Agent teams are recommended at three to five teammates. Past this, the page warns. */
export const TEAM_SIZE_WARNING = 16;

export type Mode = 'subagents' | 'team' | 'plan';

export type Prices = {
  input: number;
  cachedInput: number;
  /** Writing a five-minute cache entry. Without one, a write costs the input price. */
  cacheWrite?: number;
  output: number;
};

export type EconomicsInputs = {
  /** W: how long the task takes in one session, in minutes. */
  soloMinutes: number;
  /** s: the share of the work that can't run in parallel, from 0 to 1. */
  serialFraction: number;
  /** n: how many workers. One worker is the solo session. */
  workers: number;
  /** I: minutes the coordinator spends reading and reconciling each worker's report. */
  integrationMinutes: number;
  /** Tokens each subagent costs before it does any work. */
  spawnTokens: number;
  /** C: context every worker has to read. */
  sharedTokens: number;
  /** U: input unique to the work, split evenly across workers. */
  uniqueTokens: number;
  /** O: output each worker writes. */
  outputTokens: number;
  /** R: the report each worker returns, which the coordinator reads. */
  reportTokens: number;
  /** Whether workers after the first read the spawn overhead from a shared cache. */
  sharedPrefix: boolean;
  mode: Mode;
  /** Tokens for an agent team, as a multiple of one session. */
  teamMultiplier: number;
  /** The same with teammates in plan mode. */
  planMultiplier: number;
  prices: Prices;
};

/** Where tokens go. In a team mode every part is the solo part times the team multiplier. */
export type TokenBreakdown = {
  spawn: number;
  shared: number;
  unique: number;
  reports: number;
  output: number;
  /** Everything that's read: every part but output. */
  input: number;
  total: number;
};

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
  /** Amdahl's bound for this many workers, before integration. */
  idealSpeedup: number;
  /** `1 / s`, the speedup no number of workers can beat, or null when nothing is serial. */
  ceiling: number | null;
  /** Minutes spent integrating reports: `I × n`, or zero for one worker. */
  integration: number;
  best: BestWorkers;
  /** `√(W(1 − s)/I)`, or null when integration is free and more workers always help. */
  continuousOptimum: number | null;
  solo: TokenBreakdown;
  fan: TokenBreakdown;
  /** Fan-out tokens over solo tokens, or null when the solo session uses none. */
  tokenMultiplier: number | null;
  soloCost: number;
  fanCost: number;
  costMultiplier: number | null;
  /** The fan-out finishes after the solo session would. */
  slower: boolean;
  /** Slower, or more than twice the cost for under a 1.2× speedup. */
  warning: boolean;
  /** `time(n) ≥ W` with more than one worker: the checklist checks this item itself. */
  integrationExceedsSavings: boolean;
  /** A team mode with more than 16 teammates. */
  teamTooLarge: boolean;
};

/** Floating-point slack for comparing minutes, so 36.00000000000001 ties with 36. */
const EPSILON = 1e-9;

const nonNegative = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

const clampFraction = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const wholeWorkers = (value: number): number =>
  Number.isFinite(value) ? Math.min(MAXIMUM_WORKERS, Math.max(1, Math.round(value))) : 1;

/** Amdahl's law: the best speedup `n` workers can get when a fraction `s` is serial. */
export const amdahl = (serialFraction: number, workers: number): number => {
  const s = clampFraction(serialFraction);
  const n = Math.max(1, workers);

  return 1 / (s + (1 - s) / n);
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

/** The continuous optimum `√(W(1 − s)/I)`, or null when integration is free. */
export const continuousOptimum = (
  soloMinutes: number,
  serialFraction: number,
  integrationMinutes: number,
): number | null => {
  const I = nonNegative(integrationMinutes);
  if (I === 0) return null;

  return Math.sqrt((nonNegative(soloMinutes) * (1 - clampFraction(serialFraction))) / I);
};

const breakdown = (parts: Omit<TokenBreakdown, 'input' | 'total'>, scale = 1): TokenBreakdown => {
  const scaled = {
    spawn: parts.spawn * scale,
    shared: parts.shared * scale,
    unique: parts.unique * scale,
    reports: parts.reports * scale,
    output: parts.output * scale,
  };
  const input = scaled.spawn + scaled.shared + scaled.unique + scaled.reports;

  return { ...scaled, input, total: input + scaled.output };
};

/** One session reads the shared context and the unique work once: `C + U` in, `n × O` out. */
export const soloTokens = (inputs: EconomicsInputs): TokenBreakdown =>
  breakdown({
    spawn: 0,
    shared: nonNegative(inputs.sharedTokens),
    unique: nonNegative(inputs.uniqueTokens),
    reports: 0,
    output: wholeWorkers(inputs.workers) * nonNegative(inputs.outputTokens),
  });

export const teamMultiplierFor = (inputs: EconomicsInputs): number =>
  nonNegative(inputs.mode === 'plan' ? inputs.planMultiplier : inputs.teamMultiplier);

/**
 * Subagents: `n × (spawn + C) + U + n × R` in, `n × O` out. A team mode is the
 * solo session times its multiplier. One worker is the solo session.
 */
export const fanTokens = (inputs: EconomicsInputs): TokenBreakdown => {
  const n = wholeWorkers(inputs.workers);
  const solo = soloTokens(inputs);
  if (n === 1) return solo;

  if (inputs.mode !== 'subagents') return breakdown(solo, teamMultiplierFor(inputs));

  return breakdown({
    spawn: n * nonNegative(inputs.spawnTokens),
    shared: n * nonNegative(inputs.sharedTokens),
    unique: nonNegative(inputs.uniqueTokens),
    reports: n * nonNegative(inputs.reportTokens),
    output: n * nonNegative(inputs.outputTokens),
  });
};

/** Dollars for some tokens, summed in tokens × dollars before dividing by a million. */
export const dollars = (
  tokens: { input: number; cachedInput?: number; cacheWrite?: number; output: number },
  prices: Prices,
): number =>
  (tokens.input * prices.input +
    (tokens.cachedInput ?? 0) * prices.cachedInput +
    (tokens.cacheWrite ?? 0) * (prices.cacheWrite ?? prices.input) +
    tokens.output * prices.output) /
  TOKENS_PER_PRICE_UNIT;

const sharesPrefix = (inputs: EconomicsInputs): boolean =>
  inputs.sharedPrefix && inputs.mode === 'subagents' && wholeWorkers(inputs.workers) > 1;

/**
 * With a shared prefix, the first worker writes the spawn overhead to the cache
 * at the five-minute cache-write price.
 */
export const writtenSpawnTokens = (inputs: EconomicsInputs): number =>
  sharesPrefix(inputs) ? nonNegative(inputs.spawnTokens) : 0;

/** With a shared prefix, the other `n − 1` workers read the spawn overhead at the cached-input price. */
export const cachedSpawnTokens = (inputs: EconomicsInputs): number =>
  sharesPrefix(inputs) ? (wholeWorkers(inputs.workers) - 1) * nonNegative(inputs.spawnTokens) : 0;

export const soloCost = (inputs: EconomicsInputs): number => {
  const solo = soloTokens(inputs);

  return dollars({ input: solo.input, output: solo.output }, inputs.prices);
};

export const fanCost = (inputs: EconomicsInputs): number => {
  const fan = fanTokens(inputs);
  const cached = cachedSpawnTokens(inputs);
  const written = writtenSpawnTokens(inputs);

  return dollars(
    {
      input: fan.input - cached - written,
      cachedInput: cached,
      cacheWrite: written,
      output: fan.output,
    },
    inputs.prices,
  );
};

const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

export const evaluate = (inputs: EconomicsInputs): Evaluation => {
  const workers = wholeWorkers(inputs.workers);
  const W = nonNegative(inputs.soloMinutes);
  const fanMinutes = wallClockMinutes(W, inputs.serialFraction, inputs.integrationMinutes, workers);
  const speedup = ratio(W, fanMinutes);
  const solo = soloTokens(inputs);
  const fan = fanTokens(inputs);
  const soloDollars = soloCost(inputs);
  const fanDollars = fanCost(inputs);
  const costMultiplier = ratio(fanDollars, soloDollars);
  const slower = fanMinutes > W + EPSILON;

  return {
    workers,
    soloMinutes: W,
    fanMinutes,
    speedup,
    idealSpeedup: amdahl(inputs.serialFraction, workers),
    ceiling: speedupCeiling(inputs.serialFraction),
    integration: workers === 1 ? 0 : nonNegative(inputs.integrationMinutes) * workers,
    best: bestWorkers(W, inputs.serialFraction, inputs.integrationMinutes),
    continuousOptimum: continuousOptimum(W, inputs.serialFraction, inputs.integrationMinutes),
    solo,
    fan,
    tokenMultiplier: ratio(fan.total, solo.total),
    soloCost: soloDollars,
    fanCost: fanDollars,
    costMultiplier,
    slower,
    warning:
      slower ||
      (costMultiplier !== null && costMultiplier > 2 && speedup !== null && speedup < 1.2),
    integrationExceedsSavings: workers > 1 && fanMinutes >= W - EPSILON,
    teamTooLarge: inputs.mode !== 'subagents' && workers > TEAM_SIZE_WARNING,
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

    return {
      workers: index + 1,
      ideal: amdahl(inputs.serialFraction, index + 1),
      speedup: ratio(nonNegative(inputs.soloMinutes), minutes),
      minutes,
      tokens: fanTokens(at).total,
      cost: fanCost(at),
    };
  });
