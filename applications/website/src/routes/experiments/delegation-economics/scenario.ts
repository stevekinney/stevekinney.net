import type { EconomicsInputs, Mode } from './economics';
import { findModel } from './pricing';
import type { WorkerModel } from './pricing';

/** The one state object the calculator is derived from. */
export type Scenario = Omit<EconomicsInputs, 'prices'> & { modelId: string };

export type ScenarioField = keyof Scenario;

/** The specification's defaults. The model is filled in from the shared price table. */
export const defaultScenario = (modelId: string): Scenario => ({
  soloMinutes: 60,
  serialFraction: 0.4,
  workers: 4,
  integrationMinutes: 3,
  spawnTokens: 20_000,
  sharedTokens: 50_000,
  uniqueTokens: 300_000,
  outputTokens: 5_000,
  reportTokens: 2_000,
  sharedPrefix: false,
  mode: 'subagents',
  teamMultiplier: 3.5,
  planMultiplier: 7,
  modelId,
});

export type NumberRange = {
  /** The slider's range. */
  min: number;
  max: number;
  step: number;
  /** What the text box accepts, which can sit outside the slider's range. */
  typedMin: number;
  typedMax: number;
};

export type NumericField = Exclude<ScenarioField, 'sharedPrefix' | 'mode' | 'modelId'>;

/**
 * The specification's ranges. A text box accepts a little more than its
 * slider: zero minutes for the empty case, and a spawn overhead measured from a
 * real session that lands outside the outline's 7.5K–44K.
 */
export const ranges: Record<NumericField, NumberRange> = {
  soloMinutes: { min: 1, max: 600, step: 1, typedMin: 0, typedMax: 600 },
  serialFraction: { min: 0, max: 1, step: 0.01, typedMin: 0, typedMax: 1 },
  workers: { min: 1, max: 32, step: 1, typedMin: 1, typedMax: 32 },
  integrationMinutes: { min: 0, max: 30, step: 0.5, typedMin: 0, typedMax: 30 },
  spawnTokens: { min: 7_500, max: 44_000, step: 500, typedMin: 0, typedMax: 1_000_000 },
  sharedTokens: { min: 0, max: 1_000_000, step: 5_000, typedMin: 0, typedMax: 1_000_000 },
  uniqueTokens: { min: 0, max: 5_000_000, step: 10_000, typedMin: 0, typedMax: 5_000_000 },
  outputTokens: { min: 0, max: 200_000, step: 1_000, typedMin: 0, typedMax: 200_000 },
  reportTokens: { min: 0, max: 50_000, step: 500, typedMin: 0, typedMax: 50_000 },
  teamMultiplier: { min: 1, max: 20, step: 0.5, typedMin: 1, typedMax: 20 },
  planMultiplier: { min: 1, max: 20, step: 0.5, typedMin: 1, typedMax: 20 },
};

export const modes: { value: Mode; label: string }[] = [
  { value: 'subagents', label: 'Subagents' },
  { value: 'team', label: 'Agent team' },
  { value: 'plan', label: 'Team in plan mode' },
];

export const modeLabel = (mode: Mode): string =>
  modes.find((option) => option.value === mode)?.label ?? 'Subagents';

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const clampTo = (range: NumberRange, value: number): number =>
  clamp(value, range.typedMin, range.typedMax);

/** Where a slider rests for a value that may sit outside its range. */
export const sliderPosition = (range: NumberRange, value: number): number =>
  clamp(value, range.min, range.max);

/** The selected model, or the first one when it's gone from the table. */
export const selectedModel = (
  models: readonly WorkerModel[],
  scenario: Pick<Scenario, 'modelId'>,
): WorkerModel => findModel(models, scenario.modelId) ?? models[0];

export const toInputs = (scenario: Scenario, model: WorkerModel): EconomicsInputs => ({
  soloMinutes: scenario.soloMinutes,
  serialFraction: scenario.serialFraction,
  workers: scenario.workers,
  integrationMinutes: scenario.integrationMinutes,
  spawnTokens: scenario.spawnTokens,
  sharedTokens: scenario.sharedTokens,
  uniqueTokens: scenario.uniqueTokens,
  outputTokens: scenario.outputTokens,
  reportTokens: scenario.reportTokens,
  sharedPrefix: scenario.sharedPrefix,
  mode: scenario.mode,
  teamMultiplier: scenario.teamMultiplier,
  planMultiplier: scenario.planMultiplier,
  prices: {
    input: model.input,
    cachedInput: model.cachedInput,
    ...(model.cacheWrite5m === undefined ? {} : { cacheWrite: model.cacheWrite5m }),
    output: model.output,
  },
});
