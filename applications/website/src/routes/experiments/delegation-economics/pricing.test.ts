import { describe, expect, it } from 'vitest';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import { findModel, modelLabel, toWorkerPricing } from './pricing';

const catalog = parseModelPricingCatalog(modelPricingData);

describe('toWorkerPricing', () => {
  it('offers the shared table’s Claude models, with Sonnet 5.5 as the default', () => {
    const pricing = toWorkerPricing(catalog);

    expect(pricing.updated).toBe(catalog.updated);
    expect(pricing.defaultModelId).toBe('claude-sonnet-5-5');
    expect(pricing.models.map((model) => model.name)).toEqual(
      expect.arrayContaining([
        'Claude Fable 5.1',
        'Claude Opus 5.5',
        'Claude Sonnet 5.5',
        'Claude Haiku 4.5',
      ]),
    );
    expect(Object.keys(pricing.models[0]).sort()).toEqual(['id', 'input', 'name', 'output']);
  });

  it('matches the four input and output prices', () => {
    const byName = Object.fromEntries(
      toWorkerPricing(catalog).models.map((model) => [model.name, [model.input, model.output]]),
    );

    expect(byName['Claude Fable 5.1']).toEqual([10, 50]);
    expect(byName['Claude Opus 5.5']).toEqual([4, 20]);
    expect(byName['Claude Sonnet 5.5']).toEqual([2, 10]);
    expect(byName['Claude Haiku 4.5']).toEqual([1, 5]);
  });

  it('fails when the default model is missing', () => {
    expect(() =>
      toWorkerPricing({
        ...catalog,
        models: catalog.models.filter((model) => !model.name.includes('Sonnet')),
      }),
    ).toThrow(/claude-sonnet-5-5/);
  });
});

describe('models', () => {
  const models = toWorkerPricing(catalog).models;

  it('falls back to the first model for an unknown ID', () => {
    expect(findModel(models, 'gone')).toBe(models[0]);
  });

  it('labels a model with its input and output prices', () => {
    expect(modelLabel({ id: 's', name: 'Claude Sonnet 5.5', input: 2, output: 10 })).toBe(
      'Claude Sonnet 5.5 ($2 in / $10 out)',
    );
  });
});
