import type { EconomicsInputs } from './economics';
import type { WorkerModel } from './pricing';

/** The one state object the calculator is derived from. */
export type Scenario = Omit<EconomicsInputs, 'prices'> & { modelId: string };

export type NumericField = Exclude<keyof Scenario, 'modelId'>;

/** The defaults. The model is filled in from the shared price table. */
export const defaultScenario = (modelId: string): Scenario => ({
  soloMinutes: 60,
  serialFraction: 0.4,
  workers: 4,
  integrationMinutes: 3,
  sharedTokens: 50_000,
  spawnTokens: 20_000,
  uniqueTokens: 300_000,
  outputTokens: 5_000,
  reportTokens: 2_000,
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

/** A text box accepts zero minutes for the empty case, below its slider's range. */
export const ranges: Record<NumericField, NumberRange> = {
  soloMinutes: { min: 1, max: 600, step: 1, typedMin: 0, typedMax: 600 },
  serialFraction: { min: 0, max: 1, step: 0.01, typedMin: 0, typedMax: 1 },
  workers: { min: 1, max: 32, step: 1, typedMin: 1, typedMax: 32 },
  integrationMinutes: { min: 0, max: 30, step: 0.5, typedMin: 0, typedMax: 30 },
  sharedTokens: { min: 0, max: 1_000_000, step: 5_000, typedMin: 0, typedMax: 1_000_000 },
  spawnTokens: { min: 0, max: 50_000, step: 500, typedMin: 0, typedMax: 1_000_000 },
  uniqueTokens: { min: 0, max: 5_000_000, step: 10_000, typedMin: 0, typedMax: 5_000_000 },
  outputTokens: { min: 0, max: 200_000, step: 1_000, typedMin: 0, typedMax: 200_000 },
  reportTokens: { min: 0, max: 50_000, step: 500, typedMin: 0, typedMax: 50_000 },
};

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const clampTo = (range: NumberRange, value: number): number =>
  clamp(value, range.typedMin, range.typedMax);

/** Where a slider rests for a value that may sit outside its range. */
export const sliderPosition = (range: NumberRange, value: number): number =>
  clamp(value, range.min, range.max);

export const toInputs = (scenario: Scenario, model: WorkerModel): EconomicsInputs => ({
  soloMinutes: scenario.soloMinutes,
  serialFraction: scenario.serialFraction,
  workers: scenario.workers,
  integrationMinutes: scenario.integrationMinutes,
  sharedTokens: scenario.sharedTokens,
  spawnTokens: scenario.spawnTokens,
  uniqueTokens: scenario.uniqueTokens,
  outputTokens: scenario.outputTokens,
  reportTokens: scenario.reportTokens,
  prices: { input: model.input, output: model.output },
});
