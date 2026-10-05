import { describe, expect, it } from 'vitest';

import modelPricingData from '$lib/experiments/model-pricing.toml';
import { parseModelPricingCatalog } from '$lib/experiments/model-pricing-schema';
import {
  modelLabel,
  parsePriceTable,
  pricesEqual,
  serializePriceTable,
  toWorkerPricing,
} from './pricing';

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
    expect(Object.keys(pricing.models[0]).sort()).toEqual([
      'cachedInput',
      'id',
      'input',
      'name',
      'output',
    ]);
  });

  it('matches the specification’s four prices', () => {
    const byName = Object.fromEntries(
      toWorkerPricing(catalog).models.map((model) => [
        model.name,
        [model.input, model.cachedInput, model.output],
      ]),
    );

    expect(byName['Claude Fable 5.1']).toEqual([10, 0.25, 50]);
    expect(byName['Claude Opus 5.5']).toEqual([4, 0.2, 20]);
    expect(byName['Claude Sonnet 5.5']).toEqual([2, 0.2, 10]);
    expect(byName['Claude Haiku 4.5']).toEqual([1, 0.1, 5]);
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

describe('price table files', () => {
  const models = toWorkerPricing(catalog).models;

  it('round-trips through JSON', () => {
    const parsed = parsePriceTable(serializePriceTable(models));

    expect('models' in parsed && pricesEqual(parsed.models, models)).toBe(true);
  });

  it('accepts a bare list and derives a missing ID from the name', () => {
    expect(
      parsePriceTable('[{"name":"My Model 2","input":1,"cachedInput":0.1,"output":5}]'),
    ).toEqual({
      models: [{ id: 'my-model-2', name: 'My Model 2', input: 1, cachedInput: 0.1, output: 5 }],
    });
  });

  it('explains what’s wrong with a bad file', () => {
    expect(parsePriceTable('nope')).toEqual({ error: 'That file isn’t valid JSON.' });
    expect(parsePriceTable('{"models":[]}')).toEqual({
      error: 'Expected a "models" list with at least one model.',
    });
    expect(parsePriceTable('[{"name":"A","input":1,"output":5}]')).toEqual({
      error: 'A needs positive input, cached input, and output prices in dollars per million.',
    });
    expect(
      parsePriceTable(
        '[{"name":"A","input":1,"cachedInput":0.1,"output":5},{"name":"a","input":1,"cachedInput":0.1,"output":5}]',
      ),
    ).toEqual({ error: 'The ID “a” appears more than once.' });
    expect(
      parsePriceTable('[{"id":"Bad ID","name":"A","input":1,"cachedInput":0.1,"output":5}]'),
    ).toMatchObject({ error: expect.stringContaining('lowercase letters') });
  });

  it('labels a model with its three prices', () => {
    expect(
      modelLabel({ id: 's', name: 'Claude Sonnet 5.5', input: 2, cachedInput: 0.2, output: 10 }),
    ).toBe('Claude Sonnet 5.5 ($2 / $0.2 cached / $10)');
  });
});
