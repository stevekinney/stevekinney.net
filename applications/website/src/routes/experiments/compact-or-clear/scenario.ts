import { defaultModels, ratesFor } from './pricing';
import type { CacheTtl, ModelPrice } from './pricing';
import { summaryTokensFor } from './projection';
import type { ProjectionInputs } from './projection';
import { formatTokens } from './format-tokens';

/** The one state object the whole page is derived from. */
export type Scenario = {
  modelId: string;
  ttl: CacheTtl;
  /** Whether the cache is still warm when you compact. */
  warm: boolean;
  contextNow: number;
  summaryPercent: number;
  reread: number;
  inputPerTurn: number;
  outputPerTurn: number;
  turns: number;
  baseline: number;
  charsPerToken: number;
  laterEnabled: boolean;
  /** k: how many turns to keep going before compacting. */
  laterAfter: number;
};

export type ScenarioField = keyof Scenario;

export const defaultScenario: Scenario = {
  modelId: 'opus-5',
  ttl: '1h',
  warm: true,
  contextNow: 400_000,
  summaryPercent: 5,
  reread: 25_000,
  inputPerTurn: 5_000,
  outputPerTurn: 2_000,
  turns: 30,
  baseline: 15_000,
  charsPerToken: 4,
  laterEnabled: false,
  laterAfter: 5,
};

export type NumberRange = {
  /** The slider's range. */
  min: number;
  max: number;
  step: number;
  /** The most the text box accepts, which can sit outside the slider's range. */
  typedMin: number;
  typedMax: number;
};

/**
 * The text boxes accept values outside their sliders. The slider then rests
 * at its nearest end while the scenario uses the typed value.
 */
export const ranges = {
  contextNow: { min: 20_000, max: 1_000_000, step: 10_000, typedMin: 1_000, typedMax: 10_000_000 },
  summaryPercent: { min: 1, max: 30, step: 1, typedMin: 1, typedMax: 90 },
  reread: { min: 0, max: 300_000, step: 5_000, typedMin: 0, typedMax: 10_000_000 },
  inputPerTurn: { min: 500, max: 40_000, step: 500, typedMin: 0, typedMax: 10_000_000 },
  outputPerTurn: { min: 200, max: 20_000, step: 200, typedMin: 0, typedMax: 10_000_000 },
  turns: { min: 5, max: 120, step: 1, typedMin: 1, typedMax: 500 },
  baseline: { min: 0, max: 100_000, step: 1_000, typedMin: 0, typedMax: 10_000_000 },
  charsPerToken: { min: 1, max: 10, step: 0.5, typedMin: 1, typedMax: 10 },
} satisfies Record<string, NumberRange>;

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const clampTo = (range: NumberRange, value: number): number =>
  clamp(value, range.typedMin, range.typedMax);

export const findModel = (models: readonly ModelPrice[], modelId: string): ModelPrice =>
  models.find((model) => model.id === modelId) ?? models[0] ?? defaultModels[0];

/** The turn count for "compact later" can't go past the turn before the last. */
export const clampLaterAfter = (laterAfter: number, turns: number): number =>
  clamp(Math.round(laterAfter), 1, Math.max(1, turns - 1));

export const toProjectionInputs = (
  scenario: Scenario,
  models: readonly ModelPrice[],
): ProjectionInputs => ({
  rates: ratesFor(findModel(models, scenario.modelId), scenario.ttl),
  warm: scenario.warm,
  contextNow: scenario.contextNow,
  summaryPercent: scenario.summaryPercent,
  reread: scenario.reread,
  inputPerTurn: scenario.inputPerTurn,
  outputPerTurn: scenario.outputPerTurn,
  turns: scenario.turns,
  baseline: scenario.baseline,
});

export const ttlLabel = (ttl: CacheTtl): string => (ttl === '1h' ? '1-hour' : '5-minute');

/**
 * A summary larger than what you'd re-read after a clear, or larger than the
 * whole context, is allowed. It's worth a note, because it changes what
 * compacting is buying.
 */
export const summaryNote = (
  contextNow: number,
  summaryPercent: number,
  reread: number,
): string | null => {
  const summary = summaryTokensFor(contextNow, summaryPercent);

  if (summary >= contextNow) {
    return `A ${formatTokens(summary)} summary is as large as your context, so compacting shrinks nothing.`;
  }
  if (summary > reread) {
    return `A ${formatTokens(summary)} summary is larger than the ${formatTokens(reread)} you’d re-read after a clear.`;
  }

  return null;
};
