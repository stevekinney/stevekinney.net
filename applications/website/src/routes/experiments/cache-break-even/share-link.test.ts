import { describe, expect, it } from 'vitest';

import { defaultState } from './calculator-state';
import { defaultPricing } from './pricing';
import { decodeConfiguration, encodeConfiguration } from './share-link';

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
