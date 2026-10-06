import { describe, expect, it } from 'vitest';

import { ratesFor } from './pricing';
import type { ModelPrice } from './pricing';
import {
  compactParts,
  crossover,
  paybacks,
  project,
  summaryTokensFor,
  turnCost,
} from './projection';
import type { ProjectionInputs } from './projection';

// The shared price table's rows on 2026-10-04, pinned here so a price change can't move a test.
const opus: ModelPrice = {
  id: 'claude-opus-5-5',
  name: 'Claude Opus 5.5',
  input: 4,
  cachedInput: 0.2,
  cacheWrite5m: 5,
  cacheWrite1h: 8,
  output: 20,
  identifiers: ['claude-opus-5-5'],
};

const sonnet: ModelPrice = {
  id: 'claude-sonnet-5-5',
  name: 'Claude Sonnet 5.5',
  input: 2,
  cachedInput: 0.2,
  cacheWrite5m: 2.5,
  cacheWrite1h: 4,
  output: 10,
  identifiers: ['claude-sonnet-5-5'],
};

const defaults = (overrides: Partial<ProjectionInputs> = {}): ProjectionInputs => ({
  rates: ratesFor(opus, '1h'),
  switchRates: ratesFor(sonnet, '1h'),
  warm: true,
  contextNow: 400_000,
  summaryPercent: 5,
  inputPerTurn: 5_000,
  outputPerTurn: 2_000,
  turns: 30,
  baseline: 15_000,
  ...overrides,
});

const cents = (value: number): string => value.toFixed(2);

describe('the defaults', () => {
  const projection = project(defaults());

  it('sizes the summary at 20,000 tokens', () => {
    expect(summaryTokensFor(400_000, 5)).toBe(20_000);
    expect(projection.summaryTokens).toBe(20_000);
  });

  it('splits compacting into $0.08, $0.40, and $0.28 for $0.76', () => {
    const { parts } = projection;

    expect([parts.summarize, parts.generate, parts.rebuild, parts.total].map(cents)).toEqual([
      '0.08',
      '0.40',
      '0.28',
      '0.76',
    ]);
  });

  it('starts each strategy at its one-time cost', () => {
    expect(projection.keep[0]).toBe(0);
    expect(projection.compact[0]).toBe(projection.parts.total);
    // 400,000 tokens written to Sonnet 5.5's one-hour cache at $4 per million.
    expect(projection.switch?.[0]).toBeCloseTo(1.6, 10);
    expect(projection.switchCost).toBeCloseTo(1.6, 10);
  });

  it('pays back compacting at turn 11, and switching not within 30 turns', () => {
    expect(projection.compactCrossover).toBe(11);
    expect(projection.switchCrossover).toBeNull();
  });

  it('looks past the chart for a payback that falls after it', () => {
    expect(paybacks(defaults(), projection)).toEqual({ compact: 11, switch: 34 });
  });

  it('totals $5.89, $4.46, and $6.05 after 30 turns', () => {
    expect(projection.keep).toHaveLength(31);
    expect(cents(projection.keep[30])).toBe('5.89');
    expect(cents(projection.compact[30])).toBe('4.46');
    expect(cents(projection.switch?.[30] ?? 0)).toBe('6.05');
  });

  it('prices a turn as a re-read, a write, and the output', () => {
    // 400,000 × $0.20 + 7,000 × $8 + 2,000 × $20, per million.
    expect(turnCost(defaults(), 400_000)).toBeCloseTo(0.08 + 0.056 + 0.04, 10);
  });
});

describe('a cold cache', () => {
  const projection = project(defaults({ warm: false }));
  const premium = (400_000 * (8 - 0.2)) / 1_000_000;

  it('reads history at the full input price: $1.60 to summarize, $2.28 in all', () => {
    expect(cents(projection.parts.summarize)).toBe('1.60');
    expect(cents(projection.parts.total)).toBe('2.28');
  });

  it('pays back both moves on the first turn, because keeping going re-caches the old prefix', () => {
    expect(projection.compactCrossover).toBe(1);
    expect(projection.switchCrossover).toBe(1);
  });

  it('charges keeping going the cold write on its first turn only', () => {
    const warm = project(defaults());

    expect(projection.keep[1] - warm.keep[1]).toBeCloseTo(premium, 9);
    expect(projection.keep[30] - warm.keep[30]).toBeCloseTo(premium, 9);
  });

  it('leaves switching alone, since it re-writes the whole context either way', () => {
    expect(projection.switch).toEqual(project(defaults()).switch);
  });

  it('works with a five-minute TTL, which uses the five-minute write price', () => {
    const short = defaults({
      warm: false,
      rates: ratesFor(opus, '5m'),
      switchRates: ratesFor(sonnet, '5m'),
    });

    expect(compactParts(short).rebuild).toBeCloseTo((35_000 * 5) / 1_000_000, 10);
    expect(project(short).switchCost).toBeCloseTo((400_000 * 2.5) / 1_000_000, 10);
  });
});

describe('switching models', () => {
  it('pays back sooner with a smaller context, because the re-write is smaller', () => {
    const small = project(defaults({ contextNow: 50_000, turns: 200 }));
    const large = project(defaults({ contextNow: 800_000, turns: 200 }));

    expect(small.switchCrossover).toBe(5);
    expect(large.switchCrossover).toBe(67);
  });

  it('never pays when the destination costs more', () => {
    const projection = project(
      defaults({ rates: ratesFor(sonnet, '1h'), switchRates: ratesFor(opus, '1h'), turns: 200 }),
    );

    expect(projection.switchCrossover).toBeNull();
  });

  it('has no line without a model to switch to', () => {
    const projection = project(defaults({ switchRates: null }));

    expect(projection.switch).toBeNull();
    expect(projection.switchCrossover).toBeNull();
    expect(paybacks(defaults({ switchRates: null }), projection).switch).toBeNull();
  });
});

describe('crossover', () => {
  it('returns the first index where b is no more than a', () => {
    expect(crossover([0, 1, 2, 3], [5, 4, 2, 1])).toBe(2);
  });

  it('returns null when b stays above a', () => {
    expect(crossover([0, 1, 2], [5, 5, 5])).toBeNull();
  });

  it('treats a float-sized difference as a tie', () => {
    expect(crossover([1], [1 + 1e-12])).toBe(0);
  });
});

describe('edge cases', () => {
  it('projects a single turn, with no crossover drawn at turn zero', () => {
    const projection = project(defaults({ turns: 1 }));

    expect(projection.keep).toHaveLength(2);
    expect(projection.compactCrossover).toBeNull();
  });

  it('flags a summary that makes compacting pointless, and finds no payback for it', () => {
    expect(project(defaults()).compactCannotPay).toBe(false);

    const pointless = defaults({ contextNow: 20_000, summaryPercent: 30, turns: 120 });
    const projection = project(pointless);

    expect(projection.compactCannotPay).toBe(true);
    expect(paybacks(pointless, projection).compact).toBeNull();
  });
});
