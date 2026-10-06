import { describe, expect, it } from 'vitest';

import type { ModelPricing } from '$lib/experiments/model-pricing';

import { matchModel, ratesFor, toSessionPricing } from './pricing';

const row = (overrides: Partial<ModelPricing> & Pick<ModelPricing, 'id'>): ModelPricing => ({
  name: overrides.id,
  provider: 'Anthropic',
  input: 4,
  cachedInput: 0.2,
  output: 20,
  identifiers: [overrides.id],
  ...overrides,
});

const catalog = {
  updated: '2026-10-04',
  models: [
    row({ id: 'gpt', provider: 'OpenAI' }),
    row({ id: 'claude-opus-5-5', cacheWrite5m: 5, cacheWrite1h: 8 }),
    row({ id: 'claude-sonnet-5-5', input: 2, output: 10 }),
  ],
};

describe('toSessionPricing', () => {
  const pricing = toSessionPricing(catalog);

  it('keeps only the Claude models and picks the defaults', () => {
    expect(pricing.models.map((model) => model.id)).toEqual([
      'claude-opus-5-5',
      'claude-sonnet-5-5',
    ]);
    expect(pricing.defaultModelId).toBe('claude-opus-5-5');
    expect(pricing.defaultSwitchId).toBe('claude-sonnet-5-5');
  });

  it('bills a missing cache-write price at the input price', () => {
    const sonnet = pricing.models[1];

    expect(ratesFor(sonnet, '1h')).toEqual({ input: 2, output: 10, read: 0.2, write: 2 });
    expect(ratesFor(pricing.models[0], '5m').write).toBe(5);
    expect(ratesFor(pricing.models[0], '1h').write).toBe(8);
  });

  it('fails the build when a default model is missing', () => {
    expect(() => toSessionPricing({ ...catalog, models: catalog.models.slice(0, 2) })).toThrow(
      'claude-sonnet-5-5',
    );
  });
});

describe('matchModel', () => {
  const { models } = toSessionPricing(catalog);

  it('matches a dated, 1M-context session ID to its row', () => {
    expect(matchModel('claude-opus-5-5-20260901[1m]', models)?.id).toBe('claude-opus-5-5');
  });

  it('never matches on a prefix', () => {
    expect(matchModel('claude-opus-5', models)).toBeNull();
  });
});
