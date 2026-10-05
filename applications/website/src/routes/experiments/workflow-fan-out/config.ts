/**
 * The page's one state object: everything a person can set, with its
 * defaults and bounds. Durations are minutes. Probabilities are fractions
 * from 0 to 1.
 */

export type StageConfig = {
  name: string;
  /** The `model` on the stage's `agent()` call, or null to leave it unset. */
  modelId: string | null;
  /** The `model:` in the agent definition the stage runs as, or null for none. */
  definitionModelId: string | null;
  meanMinutes: number;
  /** Standard deviation over mean for generated durations. Zero gives every item the mean. */
  variability: number;
  tokens: number;
};

export type DurationMode = 'generated' | 'manual';
export type ResultsHandling = 'keep' | 'filter';
/**
 * Where a thrown agent error lands. Inside `pipeline()` or `parallel()` the
 * runtime catches it and the slot becomes `null`. Anywhere else, such as a
 * bare `agent()` call or `Promise.all`, it's uncaught and ends the run.
 */
export type ErrorHandling = 'caught' | 'uncaught';

export type WorkflowConfig = {
  items: number;
  stages: StageConfig[];
  durationMode: DurationMode;
  /** Minutes for each item (rows) and stage (columns), used in manual mode. */
  manual: number[][];
  concurrency: number;
  failureProbability: number;
  validationFailureProbability: number;
  validationAttempts: number;
  handling: ResultsHandling;
  errorHandling: ErrorHandling;
  sessionModelId: string;
  /** `CLAUDE_CODE_SUBAGENT_MODEL`, or null when it isn't set. */
  environmentModelId: string | null;
  seed: number;
  /** The first agent, which lists the items the fan-out works on. */
  scout: boolean;
  scoutTokens: number;
  /** The share of each agent's tokens priced as output, as a whole percent. */
  outputPercent: number;
};

export const MAXIMUM_STAGES = 4;
/** The manual grid stops growing here: past it, an editable grid and a shareable link stop being useful. */
export const MAXIMUM_MANUAL_ITEMS = 100;

export const ranges = {
  // Items can go past the runtime's 4,096 so the page can show the rejection.
  items: { minimum: 1, maximum: 10_000 },
  stages: { minimum: 1, maximum: MAXIMUM_STAGES },
  concurrency: { minimum: 1, maximum: 256 },
  meanMinutes: { minimum: 0.1, maximum: 600 },
  variability: { minimum: 0, maximum: 3 },
  tokens: { minimum: 0, maximum: 10_000_000 },
  validationAttempts: { minimum: 1, maximum: 20 },
  seed: { minimum: 0, maximum: 2_147_483_647 },
  outputPercent: { minimum: 0, maximum: 100 },
  durationMinutes: { minimum: 0.1, maximum: 600 },
} as const;

export type Range = { minimum: number; maximum: number };

export const clampTo = (range: Range, value: number): number =>
  Math.min(range.maximum, Math.max(range.minimum, value));

export const clampProbability = (value: number): number => Math.min(1, Math.max(0, value));

/** Durations are kept to a tenth of a minute, so every schedule time is exact. */
export const roundMinutes = (minutes: number): number =>
  clampTo(ranges.durationMinutes, Math.round(minutes * 10) / 10);

export const DEFAULT_SESSION_MODEL_ID = 'claude-opus-5-5';
export const DEFAULT_TOKENS = 30_000;

const defaultStageNames = ['Review', 'Verify', 'Fix', 'Report'];
const defaultStageMeans = [4, 2, 3, 1];

export const defaultStage = (index: number): StageConfig => ({
  name: defaultStageNames[index] ?? `Stage ${index + 1}`,
  modelId: null,
  definitionModelId: null,
  meanMinutes: defaultStageMeans[index] ?? 2,
  variability: 0.5,
  tokens: DEFAULT_TOKENS,
});

export const defaultConfig = (): WorkflowConfig => ({
  items: 8,
  stages: [defaultStage(0), defaultStage(1)],
  durationMode: 'generated',
  manual: [],
  concurrency: 16,
  failureProbability: 0,
  validationFailureProbability: 0,
  validationAttempts: 5,
  handling: 'keep',
  errorHandling: 'caught',
  sessionModelId: DEFAULT_SESSION_MODEL_ID,
  environmentModelId: null,
  seed: 7,
  scout: true,
  scoutTokens: DEFAULT_TOKENS,
  outputPercent: 0,
});

/**
 * The manual grid sized to `items` × `stages`. Cells that already exist keep
 * their minutes; new ones start at their stage's mean.
 */
export const resizeGrid = (
  grid: readonly (readonly number[])[],
  items: number,
  stages: readonly StageConfig[],
): number[][] =>
  Array.from({ length: Math.min(items, MAXIMUM_MANUAL_ITEMS) }, (_, item) =>
    stages.map((stage, index) => grid[item]?.[index] ?? roundMinutes(stage.meanMinutes)),
  );

export const cloneConfig = (config: WorkflowConfig): WorkflowConfig => ({
  ...config,
  stages: config.stages.map((stage) => ({ ...stage })),
  manual: config.manual.map((row) => [...row]),
});
