import { describe, expect, it } from 'vitest';

import { defaultState } from './calculator-state';
import { defaultPricing } from './pricing';
import { decodeConfiguration, encodeConfiguration } from './share-link';

describe('an enormous ratio in a link', () => {
  it('is ignored instead of overflowing the cost arithmetic', () => {
    const decoded = decodeConfiguration(
      `#from=opus-5&to=sonnet-5&n=1000&ratio=1${'0'.repeat(307)}`,
    );

    expect(decoded?.state.ratioOverride).toBeNull();
  });
});

describe('a ratio written in exponent form', () => {
  it('survives a round trip', () => {
    const state = { ...defaultState, ratioOverride: 0.0000001 };
    const decoded = decodeConfiguration(encodeConfiguration(state, defaultPricing));

    expect(decoded?.state.ratioOverride).toBe(0.0000001);
  });
});

describe('share links', () => {
  it('round-trips the full configuration', () => {
    const state = {
      fromModel: 'sonnet-5',
      fromEffort: 'low',
      toModel: 'haiku-4-5',
      toEffort: 'max',
      ttl: '5m' as const,
      contextTokens: 1_234_567,
      remainingOutput: 4_200,
      ratioOverride: 0.35,
    };

    expect(decodeConfiguration(encodeConfiguration(state, defaultPricing))).toEqual({
      state,
      pricing: defaultPricing,
    });
  });

  it('leaves default prices out of the link', () => {
    expect(encodeConfiguration(defaultState, defaultPricing)).not.toContain('prices');
  });

  it('carries custom prices, including a name with accents and symbols', () => {
    const pricing = {
      ...defaultPricing,
      models: [
        ...defaultPricing.models,
        { id: 'cafe', name: 'Café “5.5” ⚡', input: 6.5, output: 30, preservesCache: true },
      ],
      efforts: defaultPricing.efforts.map((effort) =>
        effort.id === 'xhigh' ? { ...effort, factor: 1.7, sourced: true } : effort,
      ),
    };
    const state = { ...defaultState, toModel: 'cafe' };

    const decoded = decodeConfiguration(encodeConfiguration(state, pricing));

    expect(decoded?.pricing).toEqual(pricing);
    expect(decoded?.state.toModel).toBe('cafe');
  });

  it('falls back field by field when parts of a link are garbage', () => {
    const decoded = decodeConfiguration(
      'from=nope&to=haiku-4-5&ttl=weekly&n=-4&r=lots&ratio=abc&prices=%%%',
    );

    expect(decoded?.state).toEqual({ ...defaultState, toModel: 'haiku-4-5' });
    expect(decoded?.pricing).toEqual(defaultPricing);
  });

  it('ignores a hash that is not a configuration', () => {
    expect(decodeConfiguration('')).toBeNull();
    expect(decodeConfiguration('#section')).toBeNull();
  });
});
