import { describe, expect, it } from 'vitest';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';

import { defaultConfig, DEFAULT_SESSION_MODEL_ID } from './config';
import { everyStageInherits, resolveModel, toWorkflowModels } from './models';

const models = toWorkflowModels(parseModelPricingCatalog(modelPricingData));

describe('toWorkflowModels', () => {
  it('takes the four Anthropic models from the shared price table, in its order', () => {
    expect(models.map((model) => model.name)).toEqual([
      'Fable 5.1',
      'Opus 5.5',
      'Sonnet 5.5',
      'Haiku 4.5',
    ]);
  });

  it('keeps the table’s prices, which match the outline’s figures', () => {
    expect(models.map((model) => [model.input, model.output])).toEqual([
      [10, 50],
      [4, 20],
      [2, 10],
      [1, 5],
    ]);
  });

  it('includes the default session model', () => {
    expect(models.some((model) => model.id === DEFAULT_SESSION_MODEL_ID)).toBe(true);
  });

  it('fails the build when the table has no Anthropic models', () => {
    expect(() => toWorkflowModels({ updated: '2026-10-04', models: [] })).toThrow(/no Anthropic/);
  });
});

describe('resolveModel', () => {
  const session = { sessionModelId: 'claude-opus-5-5', environmentModelId: null };

  it('checks the call, then the agent definition, then the environment variable, then the session', () => {
    expect(
      resolveModel(
        { modelId: 'claude-haiku-4-5', definitionModelId: 'claude-sonnet-5-5' },
        {
          ...session,
          environmentModelId: 'claude-fable-5-1',
        },
      ),
    ).toEqual({ modelId: 'claude-haiku-4-5', source: 'call' });
    expect(
      resolveModel(
        { modelId: null, definitionModelId: 'claude-sonnet-5-5' },
        {
          ...session,
          environmentModelId: 'claude-fable-5-1',
        },
      ),
    ).toEqual({ modelId: 'claude-sonnet-5-5', source: 'definition' });
    expect(
      resolveModel(
        { modelId: null, definitionModelId: null },
        {
          ...session,
          environmentModelId: 'claude-fable-5-1',
        },
      ),
    ).toEqual({ modelId: 'claude-fable-5-1', source: 'environment' });
    expect(resolveModel({ modelId: null, definitionModelId: null }, session)).toEqual({
      modelId: 'claude-opus-5-5',
      source: 'session',
    });
  });

  it('says every stage inherits only when nothing above the session sets a model', () => {
    const config = defaultConfig();

    expect(everyStageInherits(config)).toBe(true);
    expect(everyStageInherits({ ...config, environmentModelId: 'claude-haiku-4-5' })).toBe(false);
    config.stages[1].definitionModelId = 'claude-sonnet-5-5';
    expect(everyStageInherits(config)).toBe(false);
  });
});
