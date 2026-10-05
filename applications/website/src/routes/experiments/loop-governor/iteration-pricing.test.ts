import { describe, expect, it } from 'vitest';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';
import { formatCost } from '$lib/experiments/format';

import {
  DEFAULT_MODEL_ID,
  defaultTokens,
  findCatalogModel,
  priceIteration,
} from './iteration-pricing';
import { defaultConfig } from './loop-config';

const catalog = parseModelPricingCatalog(modelPricingData);

describe('pricing an iteration from model-pricing.toml', () => {
  const opus = findCatalogModel(catalog.models, DEFAULT_MODEL_ID);

  it('finds the default model in the shared price table', () => {
    expect(opus).toMatchObject({ name: 'Claude Opus 5.5', input: 4, cachedInput: 0.2, output: 20 });
  });

  it('gives the specification’s $0.30, $0.10, and $0.08 at the default sizes', () => {
    const { c0, r, g } = defaultConfig();

    expect(priceIteration(opus!, defaultTokens)).toEqual({ c0, r, g });
  });

  it('prices a warm cache’s history at the cached-input rate', () => {
    expect(priceIteration(opus!, { ...defaultTokens, growthCached: true }).g).toBe(0.004);
  });

  it('adds the parts before dividing, so an exact half cent rounds up', () => {
    // 50,000 × $4 + 6,750 × $20 is exactly $0.335.
    const prices = priceIteration(opus!, { ...defaultTokens, prompt: 50_000, output: 6_750 });

    expect(prices.c0).toBe(0.335);
    expect(formatCost(prices.c0)).toBe('$0.34');
  });

  it('scales with the model: Sonnet 5.5 costs half of Opus 5.5 here', () => {
    const sonnet = findCatalogModel(catalog.models, 'claude-sonnet-5-5');

    expect(priceIteration(sonnet!, defaultTokens)).toEqual({ c0: 0.15, r: 0.05, g: 0.04 });
  });
});
