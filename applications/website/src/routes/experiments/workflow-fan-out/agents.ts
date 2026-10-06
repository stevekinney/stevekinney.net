import { roundMinutes } from './config';
import type { WorkflowConfig } from './config';
import { logNormal, uniform } from './random';

/**
 * What one agent's call resolves to. `null` is an agent that was stopped or
 * hit an unrecoverable API error. `error` is a `schema` call that failed
 * validation on every attempt, which throws rather than returning `null`.
 */
export type AgentOutcome = 'value' | 'null' | 'error';

export type AgentDraw = {
  minutes: number;
  outcome: AgentOutcome;
  /** How many schema validation attempts the call made, or 0 when it never got that far. */
  attempts: number;
};

/** One row per item, one draw per stage. */
export type AgentGrid = AgentDraw[][];

type OutcomeOptions = Pick<
  WorkflowConfig,
  'seed' | 'failureProbability' | 'validationFailureProbability' | 'validationAttempts'
>;

/** Draws whether one agent returns a value, `null`, or an error. */
export const drawOutcome = (
  item: number,
  stage: number,
  options: OutcomeOptions,
): Pick<AgentDraw, 'outcome' | 'attempts'> => {
  if (uniform(options.seed, item, stage, 'failure') < options.failureProbability) {
    return { outcome: 'null', attempts: 0 };
  }

  for (let attempt = 1; attempt <= options.validationAttempts; attempt += 1) {
    if (
      uniform(options.seed, item, stage, 'schema', attempt) >= options.validationFailureProbability
    ) {
      return { outcome: 'value', attempts: attempt };
    }
  }

  return { outcome: 'error', attempts: options.validationAttempts };
};

/** A generated duration for one agent, in minutes, to a tenth. */
export const drawMinutes = (
  item: number,
  stage: number,
  seed: number,
  meanMinutes: number,
  variability: number,
): number =>
  roundMinutes(
    logNormal(
      meanMinutes,
      variability,
      uniform(seed, item, stage, 'duration', 0),
      uniform(seed, item, stage, 'duration', 1),
    ),
  );

/** Every item's duration for every stage, generated or from the manual grid. */
export const durationGrid = (config: WorkflowConfig): number[][] =>
  Array.from({ length: config.items }, (_, item) =>
    config.stages.map((stage, index) => {
      const manual = config.durationMode === 'manual' ? config.manual[item]?.[index] : undefined;

      return manual === undefined
        ? drawMinutes(item, index, config.seed, stage.meanMinutes, stage.variability)
        : roundMinutes(manual);
    }),
  );

/** Durations and outcomes for every agent in the fan-out. */
export const drawAgents = (config: WorkflowConfig): AgentGrid =>
  durationGrid(config).map((row, item) =>
    row.map((minutes, stage) => ({ minutes, ...drawOutcome(item, stage, config) })),
  );
