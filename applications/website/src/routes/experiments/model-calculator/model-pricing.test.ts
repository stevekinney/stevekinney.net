import { describe, expect, it } from 'vitest';

import { blendedPrice, findModelPricing, normalizeModelIdentifier } from './model-pricing';
import type { ModelPricing } from './model-pricing';

const modelPricing = (id: string, identifiers: string[]): ModelPricing => ({
  id,
  name: id,
  provider: 'Anthropic',
  input: 1,
  cachedInput: 0.1,
  output: 5,
  identifiers,
});

const models = [
  modelPricing('opus', ['claude-opus-5-5']),
  modelPricing('haiku', ['claude-haiku-4-5']),
];

describe('normalizeModelIdentifier', () => {
  it('drops snapshot dates and the one-million-token context suffix', () => {
    expect(normalizeModelIdentifier('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
    expect(normalizeModelIdentifier('claude-opus-5-5[1m]')).toBe('claude-opus-5-5');
    expect(normalizeModelIdentifier(' GPT-6-Astra ')).toBe('gpt-6-astra');
  });

  it('keeps version numbers that are not dates', () => {
    expect(normalizeModelIdentifier('gpt-6.1-sol')).toBe('gpt-6.1-sol');
    expect(normalizeModelIdentifier('claude-opus-5-5')).toBe('claude-opus-5-5');
  });
});

describe('findModelPricing', () => {
  it('matches a dated snapshot to its undated identifier', () => {
    expect(findModelPricing('claude-haiku-4-5-20251001', models)?.id).toBe('haiku');
  });

  it('does not match an older model whose ID is a prefix of a listed one', () => {
    expect(findModelPricing('claude-opus-5', models)).toBeUndefined();
  });

  it('returns undefined for a model the catalog does not list', () => {
    expect(findModelPricing('gpt-4o', models)).toBeUndefined();
  });
});

describe('blendedPrice', () => {
  it('adds one million input tokens to one million output tokens', () => {
    expect(blendedPrice({ input: 1.65, cachedInput: 0.206, output: 4.951 })).toBeCloseTo(6.601);
  });
});
