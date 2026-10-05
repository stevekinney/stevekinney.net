import { drawAgents } from './agents';
import type { AgentGrid } from './agents';
import type { WorkflowConfig } from './config';
import { everyStageInherits } from './models';
import type { WorkflowModel } from './models';
import { summarizeResults } from './results';
import type { ResultsSummary } from './results';
import { checkScale, describeScale, estimateCost, modelChoiceCallout } from './scale';
import type { CostEstimate, ScaleCheck } from './scale';
import { simulate } from './schedule';
import type { Schedule, Strategy } from './schedule';

export type StrategyRun = {
  schedule: Schedule;
  /** What the script receives, or null when an uncaught error ended the run. */
  results: ResultsSummary | null;
};

/** Everything the page shows, derived from the one configuration. */
export type WorkflowRun = {
  estimate: CostEstimate;
  scale: ScaleCheck;
  refusals: string[];
  warnings: string[];
  callout: string | null;
  inherits: boolean;
  /** Null when the runtime would reject or refuse the run, so nothing is simulated. */
  grid: AgentGrid | null;
  runs: Record<Strategy, StrategyRun> | null;
};

export const runWorkflow = (
  config: WorkflowConfig,
  models: readonly WorkflowModel[],
): WorkflowRun => {
  const estimate = estimateCost(config, models);
  const scale = checkScale(config.items, estimate.agents, estimate.tokens);
  const { refusals, warnings } = describeScale(
    scale,
    config.items,
    estimate.agents,
    estimate.tokens,
  );
  const blocked = scale.itemsRejected || scale.agentsRefused;
  const grid = blocked ? null : drawAgents(config);

  const runFor = (strategy: Strategy): StrategyRun => {
    const schedule = simulate(grid!, {
      strategy,
      concurrency: config.concurrency,
      errorHandling: config.errorHandling,
      validationAttempts: config.validationAttempts,
    });

    return {
      schedule,
      results: schedule.results ? summarizeResults(schedule.results, config.handling) : null,
    };
  };

  return {
    estimate,
    scale,
    refusals,
    warnings,
    callout: modelChoiceCallout(config, models),
    inherits: everyStageInherits(config),
    grid,
    runs: grid ? { pipeline: runFor('pipeline'), parallel: runFor('parallel') } : null,
  };
};
