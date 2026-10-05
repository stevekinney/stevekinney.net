import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';
import { formatPercent } from './compactions';
import {
  billedTokens,
  cacheHitRatio,
  costUnits,
  matchPrice,
  multiplierOf,
  readPrice,
  toDollars,
  toPriceRows,
  turnCost,
} from './pricing';
import type { PriceRow } from './pricing';

const prices = toPriceRows(parseModelPricingCatalog(modelPricingData).models);
const row = (id: string): PriceRow => {
  const found = prices.find((entry) => entry.id === id);
  if (!found) throw new Error(`No price row for ${id}`);

  return found;
};

const usage = (
  input: number,
  cacheRead: number,
  cacheWrite: number,
  output: number,
  split: { fiveMinute: number; oneHour: number } | null = { fiveMinute: cacheWrite, oneHour: 0 },
) => ({
  inputTokens: input,
  cacheReadTokens: cacheRead,
  cacheWriteTokens: cacheWrite,
  cacheWriteSplit: split,
  outputTokens: output,
});

describe('toPriceRows', () => {
  it('takes the Claude rows from the shared table, at the specification’s prices', () => {
    expect(
      prices.map(({ id, input, cachedInput, output }) => [id, input, cachedInput, output]),
    ).toEqual([
      ['claude-fable-5-1', 10, 0.25, 50],
      ['claude-opus-5-5', 4, 0.2, 20],
      ['claude-sonnet-5-5', 2, 0.2, 10],
      ['claude-haiku-4-5', 1, 0.1, 5],
    ]);
  });

  it('bills cache writes at 1.25 times input for five minutes and twice input for an hour', () => {
    for (const entry of prices) {
      expect(entry.cacheWrite5m).toBeCloseTo(entry.input * 1.25, 10);
      expect(entry.cacheWrite1h).toBeCloseTo(entry.input * 2, 10);
      expect(multiplierOf(entry.cacheWrite5m, entry.input)).toBe('1.25×');
      expect(multiplierOf(entry.cacheWrite1h, entry.input)).toBe('2×');
    }
  });

  it('bills writes at the input price for a row without write prices, as the table says', () => {
    const [plain] = toPriceRows([
      {
        id: 'x',
        name: 'X',
        provider: 'Anthropic',
        input: 3,
        cachedInput: 0.3,
        output: 15,
        identifiers: ['claude-sonnet-4-6'],
      },
    ]);

    expect(plain).toMatchObject({ family: 'sonnet', version: '4.6', cacheWrite5m: 3 });
  });
});

describe('turnCost', () => {
  it('costs $0.114 on Opus 5.5 for the specification’s usage (acceptance check 2)', () => {
    // 1,000×4 + 100,000×0.20 + 10,000×4×1.25 + 2,000×20 = $0.114
    const cost = turnCost(usage(1_000, 100_000, 10_000, 2_000), row('claude-opus-5-5'));

    expect(cost).toBe(0.114);
    expect(formatPercent(cacheHitRatio(1_000, 100_000, 10_000))).toBe('90.1%');
  });

  it('prices each part of a split write at its own lifetime', () => {
    const tokens = billedTokens(usage(0, 0, 3_000, 0, { fiveMinute: 1_000, oneHour: 2_000 }));

    expect(tokens).toMatchObject({ cacheWrite5m: 1_000, cacheWrite1h: 2_000 });
    expect(toDollars(costUnits(tokens, row('claude-opus-5-5')))).toBe(0.021);
  });

  it('assumes five-minute writes when the transcript has no split, and says so', () => {
    const tokens = billedTokens(usage(0, 0, 1_000, 0, null));

    expect(tokens).toMatchObject({ cacheWrite5m: 1_000, cacheWrite1h: 0, assumedFiveMinute: true });
  });

  it('shows an exact half cent rounded up', () => {
    // 67,000 output tokens on Haiku 4.5 at $5 per million is exactly $0.335.
    const cost = turnCost(usage(0, 0, 0, 67_000), row('claude-haiku-4-5'));

    expect(cost).toBe(0.335);
    expect(formatCost(cost)).toBe('$0.34');
  });
});

describe('matchPrice', () => {
  it('matches by family and version, with dates and context suffixes dropped', () => {
    expect(matchPrice('claude-opus-5-5', prices)?.id).toBe('claude-opus-5-5');
    expect(matchPrice('claude-opus-5-5-20261001', prices)?.id).toBe('claude-opus-5-5');
    expect(matchPrice('claude-opus-5-5[1m]', prices)?.id).toBe('claude-opus-5-5');
    expect(matchPrice('claude-haiku-4-5-20251001', prices)?.id).toBe('claude-haiku-4-5');
    expect(matchPrice('claude-fable-5-1', prices)?.id).toBe('claude-fable-5-1');
  });

  it('leaves another version of a family unpriced instead of guessing', () => {
    expect(matchPrice('claude-opus-5', prices)).toBeNull();
    expect(matchPrice('claude-opus-5-55', prices)).toBeNull();
    expect(matchPrice('claude-3-5-sonnet', prices)).toBeNull();
    expect(matchPrice('gpt-6-astra', prices)).toBeNull();
  });

  it('understands the older order with the family last', () => {
    expect(
      matchPrice('claude-3-5-sonnet-20241022', [{ ...row('claude-sonnet-5-5'), version: '3.5' }])
        ?.family,
    ).toBe('sonnet');
  });
});

describe('cacheHitRatio', () => {
  it('has no ratio without a prompt', () => {
    expect(cacheHitRatio(0, 0, 0)).toBeNull();
  });
});

describe('readPrice', () => {
  it('accepts a price per million, with or without a dollar sign', () => {
    expect(readPrice('4')).toBe(4);
    expect(readPrice('$0.20')).toBe(0.2);
    expect(readPrice('0')).toBe(0);
    expect(readPrice('')).toBeNull();
    expect(readPrice('-1')).toBeNull();
    expect(readPrice('lots')).toBeNull();
  });
});
