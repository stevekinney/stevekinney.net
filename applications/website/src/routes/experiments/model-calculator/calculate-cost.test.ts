import { describe, expect, it } from 'vitest';

import { calculateCost } from './calculate-cost';
import { formatCost } from '$lib/experiments/format';
import { emptyTokenUsage } from './token-usage';

const sonnetRates = { input: 2, cachedInput: 0.2, output: 10, cacheWrite5m: 2.5, cacheWrite1h: 4 };
const fableRates = {
  input: 10,
  cachedInput: 0.25,
  output: 50,
  cacheWrite5m: 12.5,
  cacheWrite1h: 20,
};

describe('calculateCost', () => {
  it('prices each kind of token per million', () => {
    const usage = { ...emptyTokenUsage(), uncachedInput: 1_000_000, cacheRead: 1_000_000 };

    expect(calculateCost({ ...usage, output: 1_000_000 }, sonnetRates)).toBeCloseTo(12.2);
  });

  it('bills cache writes at their own prices when the model has them', () => {
    const usage = { ...emptyTokenUsage(), cacheWrite5m: 1_000_000, cacheWrite1h: 1_000_000 };

    expect(calculateCost(usage, sonnetRates)).toBeCloseTo(6.5);
  });

  it('bills cache writes at the input price when the model has no write premium', () => {
    const usage = { ...emptyTokenUsage(), cacheWrite5m: 1_000_000, cacheWrite1h: 1_000_000 };

    expect(calculateCost(usage, { input: 3, cachedInput: 0.3, output: 15 })).toBeCloseTo(6);
  });

  it('adds before dividing, so a cost of exactly half a cent rounds up', () => {
    // 30,000 × $10 + 700 × $50 per million is exactly $0.335. Dividing each part
    // first lands on 0.33499999999999996, which displays as $0.33.
    const advisorCall = { ...emptyTokenUsage(), uncachedInput: 30_000, output: 700 };
    // The pricing table lists Qwen3.8-Flash at $0.495 for a million tokens each way.
    const millionEachWay = { ...emptyTokenUsage(), uncachedInput: 1_000_000, output: 1_000_000 };

    expect(formatCost(calculateCost(advisorCall, fableRates))).toBe('$0.34');
    expect(
      formatCost(
        calculateCost(millionEachWay, { input: 0.113, cachedInput: 0.014, output: 0.382 }),
      ),
    ).toBe('$0.50');
  });

  it('reproduces the cost Claude Code recorded for a real Claude Sonnet 5.5 session', () => {
    // Token counts and cost copied from that session's `cost-state` line.
    const usage = {
      uncachedInput: 6,
      cacheRead: 152_171,
      cacheWrite5m: 0,
      cacheWrite1h: 50_634,
      output: 1_548,
    };

    expect(calculateCost(usage, sonnetRates)).toBeCloseTo(0.2484622, 10);
  });
});
