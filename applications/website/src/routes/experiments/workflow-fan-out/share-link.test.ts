import { describe, expect, it } from 'vitest';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';

import { defaultConfig } from './config';
import { toWorkflowModels } from './models';
import { findPreset } from './presets';
import { decodeConfiguration, encodeConfiguration } from './share-link';

const models = toWorkflowModels(parseModelPricingCatalog(modelPricingData));

describe('share links', () => {
  it('round-trips the defaults', () => {
    const query = encodeConfiguration(defaultConfig(), models, models);

    expect(decodeConfiguration(query, models)).toEqual({ config: defaultConfig(), prices: {} });
  });

  it('round-trips a manual grid, per-stage models, and every option', () => {
    const config = findPreset('slow-first-slow-last')!.config();
    config.stages[0].modelId = 'claude-haiku-4-5';
    config.stages[1].definitionModelId = 'claude-sonnet-5-5';
    Object.assign(config, {
      failureProbability: 0.06,
      validationFailureProbability: 0.25,
      validationAttempts: 3,
      handling: 'filter',
      errorHandling: 'uncaught',
      environmentModelId: 'claude-sonnet-5-5',
      scoutTokens: 12_000,
      outputPercent: 20,
      seed: 99,
    });

    expect(
      decodeConfiguration(encodeConfiguration(config, models, models), models)?.config,
    ).toEqual(config);
  });

  it('carries edited prices and nothing else about the price table', () => {
    const edited = models.map((model) =>
      model.id === 'claude-haiku-4-5' ? { ...model, input: 0.8, output: 4 } : model,
    );
    const query = encodeConfiguration(defaultConfig(), edited, models);

    expect(query).toContain('price-claude-haiku-4-5=0.8%2F4');
    expect(decodeConfiguration(query, models)?.prices).toEqual({
      'claude-haiku-4-5': { input: 0.8, output: 4 },
    });
  });

  it('drops unknown models and clamps numbers out of range', () => {
    const shared = decodeConfiguration(
      'items=99999&concurrency=900&session=gpt-9&s1name=A&s1model=nope&failure=7',
      models,
    );

    expect(shared?.config.items).toBe(10_000);
    expect(shared?.config.concurrency).toBe(256);
    expect(shared?.config.sessionModelId).toBe('claude-opus-5-5');
    expect(shared?.config.stages).toHaveLength(1);
    expect(shared?.config.stages[0].modelId).toBeNull();
    expect(shared?.config.failureProbability).toBe(1);
  });

  it('ignores a malformed grid and returns null for an empty hash', () => {
    expect(decodeConfiguration('items=4&grid=1,x;2,3', models)?.config.durationMode).toBe(
      'generated',
    );
    expect(decodeConfiguration('', models)).toBeNull();
    expect(decodeConfiguration('unrelated=1', models)).toBeNull();
  });
});
