import type { ModelPricingCatalog } from '$lib/experiments/model-pricing';

import type { StageConfig, WorkflowConfig } from './config';

/** A model an agent can run on, with its prices in dollars per million tokens. */
export type WorkflowModel = {
  /** The catalog's ID, such as `claude-opus-5-5`. */
  id: string;
  /** The name without the brand, such as `Opus 5.5`. */
  name: string;
  input: number;
  output: number;
};

/**
 * The models a workflow agent can run on: every Anthropic row in the shared
 * price table, in the table's order. Runs on the server while the page
 * prerenders, so the browser gets plain data.
 */
export const toWorkflowModels = (catalog: ModelPricingCatalog): WorkflowModel[] => {
  const models = catalog.models
    .filter((model) => model.provider === 'Anthropic')
    .map((model) => ({
      id: model.id,
      name: model.name.replace(/^Claude\s+/, ''),
      input: model.input,
      output: model.output,
    }));

  if (models.length === 0) {
    throw new Error('model-pricing.toml has no Anthropic models for the workflow fan-out page.');
  }

  return models;
};

/** Where an agent's model came from, in the order the runtime checks. */
export type ModelSource = 'call' | 'definition' | 'environment' | 'session';

export const modelSourceLabels: Record<ModelSource, string> = {
  call: 'the agent() call',
  definition: 'the agent definition',
  environment: 'CLAUDE_CODE_SUBAGENT_MODEL',
  session: 'your session',
};

export type ResolvedModel = { modelId: string; source: ModelSource };

/**
 * Picks a stage's model the way the runtime does: the `model` on the
 * `agent()` call, then the agent definition's `model:`, then
 * `CLAUDE_CODE_SUBAGENT_MODEL`, then the session's model.
 */
export const resolveModel = (
  stage: Pick<StageConfig, 'modelId' | 'definitionModelId'>,
  config: Pick<WorkflowConfig, 'environmentModelId' | 'sessionModelId'>,
): ResolvedModel => {
  if (stage.modelId) return { modelId: stage.modelId, source: 'call' };
  if (stage.definitionModelId) return { modelId: stage.definitionModelId, source: 'definition' };
  if (config.environmentModelId)
    return { modelId: config.environmentModelId, source: 'environment' };

  return { modelId: config.sessionModelId, source: 'session' };
};

/** Whether every stage falls through to the session's model. */
export const everyStageInherits = (config: WorkflowConfig): boolean =>
  config.stages.every((stage) => resolveModel(stage, config).source === 'session');

export const findModel = (
  models: readonly WorkflowModel[],
  id: string,
): WorkflowModel | undefined => models.find((model) => model.id === id);
