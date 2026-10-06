import { formatCompactTokenCount, formatCost, formatTokenCount } from '$lib/experiments/format';

import type { WorkflowConfig } from './config';
import { findModel, resolveModel } from './models';
import type { ModelSource, WorkflowModel } from './models';

/** The runtime's limits and warning thresholds, per the workflows documentation. */
export const LIMITS = {
  itemsPerCall: 4_096,
  agentsPerRun: 1_000,
  /** "Large workflow" shows above this many scheduled agents. */
  warningAgents: 25,
  /** …or above this many projected tokens. */
  warningTokens: 1_500_000,
  defaultConcurrency: 16,
  maximumConcurrency: 256,
} as const;

export type CostRow = {
  /** `scout`, or the stage's index. */
  key: 'scout' | number;
  label: string;
  agents: number;
  tokens: number;
  model: WorkflowModel;
  source: ModelSource;
  cost: number;
};

export type CostEstimate = {
  rows: CostRow[];
  agents: number;
  tokens: number;
  cost: number;
  /** The total before dividing, in hundred-millionths of a dollar, so comparisons stay exact. */
  exact: number;
};

// A row's dollars are tokens × (input × (100 − output%) + output × output%), summed and
// then divided once by 100 × 1,000,000. Dividing per row would leave float noise in the total.
const DIVISOR = 100 * 1_000_000;

const rowNumerator = (tokens: number, model: WorkflowModel, outputPercent: number): number =>
  tokens * (model.input * (100 - outputPercent) + model.output * outputPercent);

const modelFor = (models: readonly WorkflowModel[], id: string): WorkflowModel =>
  findModel(models, id) ?? models[0];

/**
 * Agents, tokens, and dollars for the run as planned: every item through
 * every stage, plus the scout. Each agent's tokens are priced as uncached
 * input plus the output share, a deliberate simplification.
 */
export const estimateCost = (
  config: WorkflowConfig,
  models: readonly WorkflowModel[],
): CostEstimate => {
  const rows: (CostRow & { numerator: number })[] = config.stages.map((stage, index) => {
    const resolved = resolveModel(stage, config);
    const model = modelFor(models, resolved.modelId);
    const tokens = config.items * stage.tokens;
    const numerator = rowNumerator(tokens, model, config.outputPercent);

    return {
      key: index,
      label: `Stage ${index + 1}: ${stage.name}`,
      agents: config.items,
      tokens,
      model,
      source: resolved.source,
      cost: numerator / DIVISOR,
      numerator,
    };
  });

  if (config.scout) {
    // The scout is a plain `agent()` call with no model of its own.
    const resolved = resolveModel({ modelId: null, definitionModelId: null }, config);
    const model = modelFor(models, resolved.modelId);
    const numerator = rowNumerator(config.scoutTokens, model, config.outputPercent);

    rows.push({
      key: 'scout',
      label: 'Scout',
      agents: 1,
      tokens: config.scoutTokens,
      model,
      source: resolved.source,
      cost: numerator / DIVISOR,
      numerator,
    });
  }

  const exact = rows.reduce((sum, row) => sum + row.numerator, 0);

  return {
    rows: rows.map(({ numerator: _numerator, ...row }) => row),
    agents: rows.reduce((sum, row) => sum + row.agents, 0),
    tokens: rows.reduce((sum, row) => sum + row.tokens, 0),
    cost: exact / DIVISOR,
    exact,
  };
};

/** The same run with every stage left to inherit its model. */
export const inheritedConfig = (config: WorkflowConfig): WorkflowConfig => ({
  ...config,
  stages: config.stages.map((stage) => ({ ...stage, modelId: null, definitionModelId: null })),
});

/**
 * What choosing models per stage changes, against leaving every stage to
 * inherit: "Setting stage 1 to Haiku 4.5 saves $4.50 (37%)." Null when every
 * stage already inherits.
 */
export const modelChoiceCallout = (
  config: WorkflowConfig,
  models: readonly WorkflowModel[],
): string | null => {
  const baselineConfig = inheritedConfig(config);
  const changed = config.stages.flatMap((stage, index) => {
    const chosen = resolveModel(stage, config).modelId;

    return chosen === resolveModel(baselineConfig.stages[index], baselineConfig).modelId
      ? []
      : [{ index, model: modelFor(models, chosen) }];
  });
  if (changed.length === 0) return null;

  const current = estimateCost(config, models).exact;
  const baseline = estimateCost(baselineConfig, models).exact;
  const difference = baseline - current;
  const percent = baseline > 0 ? Math.round((Math.abs(difference) / baseline) * 100) : 0;
  const amount = `${formatCost(Math.abs(difference) / DIVISOR)} (${percent}%)`;
  const subject =
    changed.length === 1
      ? `Setting stage ${changed[0].index + 1} to ${changed[0].model.name}`
      : 'Choosing models per stage';

  if (difference === 0) return `${subject} costs the same as letting every stage inherit.`;

  return difference > 0 ? `${subject} saves ${amount}.` : `${subject} costs ${amount} more.`;
};

export type ScaleCheck = {
  /** Items past the per-call limit: the runtime rejects the call outright. */
  itemsRejected: boolean;
  /** Agents past the per-run limit: the runtime refuses the run. */
  agentsRefused: boolean;
  largeByAgents: boolean;
  largeByTokens: boolean;
};

/** Which limits and warnings a run trips. Each warning is strictly above its threshold. */
export const checkScale = (items: number, agents: number, tokens: number): ScaleCheck => ({
  itemsRejected: items > LIMITS.itemsPerCall,
  agentsRefused: agents > LIMITS.agentsPerRun,
  largeByAgents: agents > LIMITS.warningAgents,
  largeByTokens: tokens > LIMITS.warningTokens,
});

/** The sentences the page shows for each limit and warning that applies. */
export const describeScale = (
  check: ScaleCheck,
  items: number,
  agents: number,
  tokens: number,
): { refusals: string[]; warnings: string[] } => {
  const refusals: string[] = [];
  const warnings: string[] = [];

  if (check.itemsRejected) {
    refusals.push(
      `Rejected: pipeline() and parallel() take at most ${formatTokenCount(LIMITS.itemsPerCall)} items per call, per the workflows documentation, and this call has ${formatTokenCount(items)}. No agent starts.`,
    );
  }
  if (check.agentsRefused) {
    refusals.push(
      `Refused: a run can have at most ${formatTokenCount(LIMITS.agentsPerRun)} agents, per the workflows documentation, and this one schedules ${formatTokenCount(agents)}.`,
    );
  }
  if (check.largeByAgents) {
    warnings.push(
      `Large workflow: ${formatTokenCount(agents)} agents is more than ${LIMITS.warningAgents}.`,
    );
  }
  if (check.largeByTokens) {
    warnings.push(
      `Large workflow: ${formatCompactTokenCount(tokens)} projected tokens is more than ${formatCompactTokenCount(LIMITS.warningTokens)}.`,
    );
  }

  return { refusals, warnings };
};
