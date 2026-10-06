import type { EffortLevel, ModelPrice } from './pricing';

/** How long the prompt cache lives: five minutes or one hour. */
export type CacheTtl = '5m' | '1h';

export const TOKENS_PER_MILLION = 1_000_000;

/** What a cache write costs relative to the input price. */
export const writeMultiplier = (ttl: CacheTtl): number => (ttl === '1h' ? 2 : 1.25);

/** The one-time cost of reprocessing `contextTokens` as a cache write on the destination model. */
export const switchCost = (contextTokens: number, to: ModelPrice, ttl: CacheTtl): number =>
  (contextTokens * to.input * writeMultiplier(ttl)) / TOKENS_PER_MILLION;

/** How much output the destination effort generates compared with the starting one. */
export const autoRatio = (fromEffort: EffortLevel, toEffort: EffortLevel): number =>
  fromEffort.factor > 0 ? toEffort.factor / fromEffort.factor : 1;

/** Dollars saved per million output tokens: what you pay now minus what you'd pay after the change. */
export const savingsPerMillion = (from: ModelPrice, to: ModelPrice, ratio: number): number =>
  from.output - ratio * to.output;

/** Dollars saved per output token. Spec: `(from.output − r × to.output) / 1e6`. */
export const perTokenSavings = (from: ModelPrice, to: ModelPrice, ratio: number): number =>
  savingsPerMillion(from, to, ratio) / TOKENS_PER_MILLION;

/** What the remaining output work saves. */
export const remainingValue = (
  remainingOutput: number,
  from: ModelPrice,
  to: ModelPrice,
  ratio: number,
): number => remainingOutput * perTokenSavings(from, to, ratio);

/** The most context you can have before the change stops paying for itself. `null` when it never pays. */
export const breakEvenContext = (
  remainingOutput: number,
  from: ModelPrice,
  to: ModelPrice,
  ratio: number,
  ttl: CacheTtl,
): number | null => {
  const savings = perTokenSavings(from, to, ratio);
  if (savings <= 0) return null;

  const costPerContextToken = (to.input * writeMultiplier(ttl)) / TOKENS_PER_MILLION;
  // A destination with a free input price never costs anything to re-cache.
  if (costPerContextToken === 0) return Number.POSITIVE_INFINITY;

  return (remainingOutput * savings) / costPerContextToken;
};

/** The least remaining output work that pays back the re-cache. `null` when it never pays. */
export const breakEvenOutput = (
  contextTokens: number,
  from: ModelPrice,
  to: ModelPrice,
  ratio: number,
  ttl: CacheTtl,
): number | null => {
  const savings = perTokenSavings(from, to, ratio);
  if (savings <= 0) return null;

  return switchCost(contextTokens, to, ttl) / savings;
};

/**
 * Floating-point error can leave a change that breaks even exactly a hair
 * behind. A hundred-millionth of a dollar is far below anything displayed.
 */
const EPSILON = 1e-9;

export type ChangeInputs = {
  from: ModelPrice;
  fromEffort: EffortLevel;
  to: ModelPrice;
  toEffort: EffortLevel;
  ttl: CacheTtl;
  contextTokens: number;
  remainingOutput: number;
  /** A ratio the person typed. `null` means use the one the efforts imply. */
  ratioOverride: number | null;
};

export type VerdictKind = 'unchanged' | 'never' | 'worth-it' | 'not-yet';

export type ChangeEvaluation = ChangeInputs & {
  autoRatio: number;
  ratio: number;
  overridden: boolean;
  /** Same model, same effort, and no ratio override. */
  unchanged: boolean;
  cost: number;
  value: number;
  net: number;
  savingsPerMillion: number;
  breakEvenContext: number | null;
  breakEvenOutput: number | null;
  verdict: VerdictKind;
  /** Same model, a different effort, and a model that can change effort without resetting the cache. */
  cachePreserving: boolean;
};

/** Everything the page shows about one change, from nothing but its inputs. */
export const evaluateChange = (inputs: ChangeInputs): ChangeEvaluation => {
  const { from, fromEffort, to, toEffort, ttl, contextTokens, remainingOutput, ratioOverride } =
    inputs;

  const automatic = autoRatio(fromEffort, toEffort);
  const overridden = ratioOverride !== null;
  const ratio = overridden ? ratioOverride : automatic;
  const unchanged = from.id === to.id && fromEffort.id === toEffort.id && !overridden;

  const cost = unchanged ? 0 : switchCost(contextTokens, to, ttl);
  const value = unchanged ? 0 : remainingValue(remainingOutput, from, to, ratio);
  const net = value - cost;
  const savings = unchanged ? 0 : savingsPerMillion(from, to, ratio);

  const beContext = unchanged ? null : breakEvenContext(remainingOutput, from, to, ratio, ttl);
  const beOutput = unchanged ? null : breakEvenOutput(contextTokens, from, to, ratio, ttl);

  let verdict: VerdictKind;
  if (unchanged) verdict = 'unchanged';
  else if (savings <= 0) verdict = 'never';
  else if (net >= -EPSILON) verdict = 'worth-it';
  else verdict = 'not-yet';

  return {
    ...inputs,
    autoRatio: automatic,
    ratio,
    overridden,
    unchanged,
    cost,
    value,
    net,
    savingsPerMillion: savings,
    breakEvenContext: beContext,
    breakEvenOutput: beOutput,
    verdict,
    cachePreserving: from.id === to.id && fromEffort.id !== toEffort.id && to.preservesCache,
  };
};

/** The cost of the change when you already have this much context. Drives the chart's cost line. */
export const costAtContext = (evaluation: ChangeEvaluation, contextTokens: number): number =>
  evaluation.unchanged ? 0 : switchCost(contextTokens, evaluation.to, evaluation.ttl);

/** The net of the change at a given context and remaining output. Drives the sensitivity map. */
export const netAt = (
  evaluation: ChangeEvaluation,
  contextTokens: number,
  remainingOutput: number,
): number =>
  evaluation.unchanged
    ? 0
    : remainingValue(remainingOutput, evaluation.from, evaluation.to, evaluation.ratio) -
      switchCost(contextTokens, evaluation.to, evaluation.ttl);

/**
 * The slope of the break-even boundary: the change pays back whenever remaining
 * output is at least this many times the context. `null` when it never pays.
 */
export const boundaryCoefficient = (evaluation: ChangeEvaluation): number | null => {
  if (evaluation.unchanged || evaluation.savingsPerMillion <= 0) return null;

  return (evaluation.to.input * writeMultiplier(evaluation.ttl)) / evaluation.savingsPerMillion;
};

/** Whether this is a drop in output (`dropping`), a rise (`raising`), or no change in volume. */
export const effortDirection = (
  fromEffort: EffortLevel,
  toEffort: EffortLevel,
): 'dropping' | 'raising' | 'same' =>
  toEffort.factor < fromEffort.factor
    ? 'dropping'
    : toEffort.factor > fromEffort.factor
      ? 'raising'
      : 'same';
