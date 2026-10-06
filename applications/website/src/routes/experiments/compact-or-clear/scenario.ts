import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

import { ratesFor } from './pricing';
import type { CacheTtl, ModelPrice, SessionPricing } from './pricing';
import { summaryTokensFor } from './projection';
import type { ProjectionInputs } from './projection';

/** The one state object the whole page is derived from. */
export type Scenario = {
  modelId: string;
  /** The cheaper model you might switch to. */
  switchId: string;
  ttl: CacheTtl;
  /** Whether the cache is still warm right now. */
  warm: boolean;
  contextNow: number;
  summaryPercent: number;
  inputPerTurn: number;
  outputPerTurn: number;
  turns: number;
  baseline: number;
};

export type ScenarioField = keyof Scenario;

/** Everything but the models, which come from the shared price table. */
export const defaultAssumptions = {
  ttl: '1h',
  warm: true,
  contextNow: 400_000,
  summaryPercent: 5,
  inputPerTurn: 5_000,
  outputPerTurn: 2_000,
  turns: 30,
  baseline: 15_000,
} satisfies Omit<Scenario, 'modelId' | 'switchId'>;

export const createScenario = (
  pricing: Pick<SessionPricing, 'defaultModelId' | 'defaultSwitchId'>,
): Scenario => ({
  ...defaultAssumptions,
  modelId: pricing.defaultModelId,
  switchId: pricing.defaultSwitchId,
});

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
  inputPerTurn: { min: 500, max: 40_000, step: 500, typedMin: 0, typedMax: 10_000_000 },
  outputPerTurn: { min: 200, max: 20_000, step: 200, typedMin: 0, typedMax: 10_000_000 },
  turns: { min: 5, max: 120, step: 1, typedMin: 1, typedMax: 500 },
  baseline: { min: 0, max: 100_000, step: 1_000, typedMin: 0, typedMax: 10_000_000 },
} satisfies Record<string, NumberRange>;

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const clampTo = (range: NumberRange, value: number): number =>
  clamp(value, range.typedMin, range.typedMax);

export const findModel = (models: readonly ModelPrice[], modelId: string): ModelPrice =>
  models.find((model) => model.id === modelId) ?? models[0];

/**
 * The model to switch to. Switching to the model you're already on isn't a
 * switch, so when the two collide, such as after an import, it falls back to
 * the cheapest other model.
 */
export const switchModel = (
  models: readonly ModelPrice[],
  modelId: string,
  switchId: string,
): ModelPrice | null => {
  if (switchId !== modelId) {
    const chosen = models.find((model) => model.id === switchId);
    if (chosen) return chosen;
  }

  const others = models.filter((model) => model.id !== modelId);

  return others.reduce<ModelPrice | null>(
    (cheapest, model) => (cheapest === null || model.output < cheapest.output ? model : cheapest),
    null,
  );
};

export const toProjectionInputs = (
  scenario: Scenario,
  models: readonly ModelPrice[],
): ProjectionInputs => {
  const destination = switchModel(models, scenario.modelId, scenario.switchId);

  return {
    rates: ratesFor(findModel(models, scenario.modelId), scenario.ttl),
    switchRates: destination ? ratesFor(destination, scenario.ttl) : null,
    warm: scenario.warm,
    contextNow: scenario.contextNow,
    summaryPercent: scenario.summaryPercent,
    inputPerTurn: scenario.inputPerTurn,
    outputPerTurn: scenario.outputPerTurn,
    turns: scenario.turns,
    baseline: scenario.baseline,
  };
};

/**
 * A summary as large as the whole context is allowed. It's worth a note,
 * because compacting then buys nothing.
 */
export const summaryNote = (contextNow: number, summaryPercent: number): string | null => {
  const summary = summaryTokensFor(contextNow, summaryPercent);

  if (summary >= contextNow) {
    return `A ${formatTokens(summary)} summary is as large as your context, so compacting shrinks nothing.`;
  }
  return null;
};
