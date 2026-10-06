import { describe, expect, it } from 'vitest';

import { defaultModels, ratesFor } from './pricing';
import {
  bestAt,
  compactLaterSeries,
  compactParts,
  clearOneTime,
  crossover,
  project,
  summaryTokensFor,
  tableTurns,
  turnCost,
} from './projection';
import type { ProjectionInputs } from './projection';

const opus = defaultModels.find((model) => model.id === 'opus-5')!;
const sonnet = defaultModels.find((model) => model.id === 'sonnet-5')!;

const defaults = (overrides: Partial<ProjectionInputs> = {}): ProjectionInputs => ({
  rates: ratesFor(opus, '1h'),
  warm: true,
  contextNow: 400_000,
  summaryPercent: 5,
  reread: 25_000,
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

  it('splits compacting into $0.20, $0.50, and $0.35 for $1.05', () => {
    const { parts } = projection;

    expect([parts.summarize, parts.generate, parts.rebuild, parts.total].map(cents)).toEqual([
      '0.20',
      '0.50',
      '0.35',
      '1.05',
    ]);
    expect(parts.generate / parts.total).toBeGreaterThan(0.47);
    expect(Math.round((parts.generate / parts.total) * 100)).toBe(48);
  });

  it('charges $0.40 up front to clear', () => {
    expect(cents(clearOneTime(defaults()))).toBe('0.40');
    expect(cents(projection.clear[0])).toBe('0.40');
  });

  it('starts keeping going at nothing and the others at their one-time cost', () => {
    expect(projection.keep[0]).toBe(0);
    expect(projection.compact[0]).toBe(projection.parts.total);
  });

  it('pays back compacting at turn 6 and clearing at turn 3', () => {
    expect(projection.compactCrossover).toBe(6);
    expect(projection.clearCrossover).toBe(3);
  });

  it('totals $11.12, $6.70, and $6.12 after 30 turns', () => {
    expect(projection.keep).toHaveLength(31);
    expect(cents(projection.keep[30])).toBe('11.12');
    expect(cents(projection.compact[30])).toBe('6.70');
    expect(cents(projection.clear[30])).toBe('6.12');
  });

  it('prices a turn as a re-read, a write, and the output', () => {
    // 400,000 × $0.50 + 7,000 × $10 + 2,000 × $25, per million.
    expect(turnCost(defaults(), 400_000)).toBeCloseTo(0.2 + 0.07 + 0.05, 10);
  });
});

describe('a cold cache', () => {
  const projection = project(defaults({ warm: false }));

  it('reads history at the full input price: $2.00 to summarize, $2.85 in all', () => {
    expect(cents(projection.parts.summarize)).toBe('2.00');
    expect(cents(projection.parts.total)).toBe('2.85');
  });

  it('pays back on the first turn, because keeping going re-caches the whole old prefix', () => {
    // Turn 1 of keeping going writes all 400K tokens back to the cache at 2× input. Compacting
    // pays $2.00 to read them once and never writes the old prefix again.
    expect(projection.compactCrossover).toBe(1);
  });

  it('charges keeping going the cold write on its first turn only', () => {
    const warm = project(defaults());
    // Write at 2× the $5 input price, instead of reading at 0.1×.
    const premium = (400_000 * (10 - 0.5)) / 1_000_000;

    expect(projection.keep[1] - warm.keep[1]).toBeCloseTo(premium, 9);
    expect(projection.keep[30] - warm.keep[30]).toBeCloseTo(premium, 9);
  });

  it('compacts later against a warm cache, because the turns before it refreshed it', () => {
    const cold = defaults({ warm: false });
    const later = compactLaterSeries(cold, 5);
    const laterWarm = compactLaterSeries(defaults(), 5);
    const premium = (400_000 * (10 - 0.5)) / 1_000_000;

    expect(later[5] - laterWarm[5]).toBeCloseTo(premium, 9);
    expect(later[30] - laterWarm[30]).toBeCloseTo(premium, 9);
  });

  it('works with a five-minute TTL, which writes at 1.25 times input', () => {
    const short = project(defaults({ warm: false, rates: ratesFor(opus, '5m') }));

    expect(cents(short.parts.rebuild)).toBe('0.22');
    expect(short.compactCrossover).not.toBeNull();
  });
});

describe('model independence', () => {
  it('scales every dollar figure by 0.4 and leaves the crossovers alone on Sonnet 5', () => {
    const base = project(defaults());
    const scaled = project(defaults({ rates: ratesFor(sonnet, '1h') }));

    for (const strategy of ['keep', 'compact', 'clear'] as const) {
      scaled[strategy].forEach((value, turn) => {
        expect(value).toBeCloseTo(base[strategy][turn] * 0.4, 9);
      });
    }

    expect(scaled.compactCrossover).toBe(6);
    expect(scaled.clearCrossover).toBe(3);
  });

  it('holds on a cold cache too', () => {
    const base = project(defaults({ warm: false }));
    const scaled = project(defaults({ warm: false, rates: ratesFor(sonnet, '1h') }));

    expect(scaled.compactCrossover).toBe(base.compactCrossover);
  });
});

describe('compact later', () => {
  const inputs = defaults();
  const growth = 7_000;

  it('equals compacting now when k is zero', () => {
    const now = project(inputs);

    compactLaterSeries(inputs, 0).forEach((value, turn) => {
      expect(value).toBeCloseTo(now.compact[turn], 10);
    });
  });

  it('matches keeping going before turn k, then jumps by the cost at N′', () => {
    const k = 4;
    const keep = project(inputs).keep;
    const later = compactLaterSeries(inputs, k);
    const compactionCost = compactParts(inputs, 400_000 + k * growth).total;

    for (let turn = 0; turn < k; turn += 1) expect(later[turn]).toBe(keep[turn]);

    expect(later[k] - keep[k]).toBeCloseTo(compactionCost, 10);
    expect(compactParts(inputs, 400_000 + k * growth).summaryTokens).toBe(
      summaryTokensFor(428_000, 5),
    );
  });

  it('continues on the compacted prefix after the jump', () => {
    const k = 4;
    const later = compactLaterSeries(inputs, k);
    const summary = summaryTokensFor(400_000 + k * growth, 5);

    expect(later[k + 1] - later[k]).toBeCloseTo(turnCost(inputs, 15_000 + summary), 10);
    expect(later[k + 2] - later[k + 1]).toBeCloseTo(
      turnCost(inputs, 15_000 + summary + growth),
      10,
    );
  });

  it('is more expensive than compacting now at the end, so waiting is not free', () => {
    const now = project(inputs);
    const later = compactLaterSeries(inputs, 10);

    expect(later[30]).toBeGreaterThan(now.compact[30]);
  });

  it('only looks for a crossover from turn k, where it first differs from keeping going', () => {
    const projection = project(inputs, 4);

    expect(projection.later).toHaveLength(31);
    expect(projection.laterCrossover).toBeGreaterThan(4);
    expect(project(inputs).later).toBeNull();
    expect(project(inputs).laterCrossover).toBeNull();
  });

  it('keeps a jump past the last turn at the end of the series', () => {
    const short = compactLaterSeries(defaults({ turns: 5 }), 9);

    expect(short).toHaveLength(6);
  });
});

describe('crossover', () => {
  it('returns the first index where b is no more than a', () => {
    expect(crossover([0, 1, 2, 3], [5, 4, 2, 1])).toBe(2);
  });

  it('returns null when b stays above a', () => {
    expect(crossover([0, 1, 2], [5, 5, 5])).toBeNull();
  });

  it('starts looking at `from`', () => {
    expect(crossover([0, 1, 2], [0, 5, 5], 1)).toBeNull();
    expect(crossover([0, 1, 2], [0, 5, 5])).toBe(0);
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
    expect(projection.compactCrossover).not.toBe(0);
  });

  it('charges only the baseline to clear when there is nothing to re-read', () => {
    expect(cents(clearOneTime(defaults({ reread: 0 })))).toBe('0.15');
  });

  it('flags a summary that makes compacting pointless', () => {
    expect(project(defaults()).compactCannotPay).toBe(false);
    expect(project(defaults({ contextNow: 20_000, summaryPercent: 30 })).compactCannotPay).toBe(
      true,
    );
    expect(project(defaults({ contextNow: 60_000, summaryPercent: 75 })).compactCannotPay).toBe(
      true,
    );
  });

  it('never finds a payback when compacting cannot shrink the prefix', () => {
    const projection = project(defaults({ contextNow: 20_000, summaryPercent: 30, turns: 120 }));

    expect(projection.compactCrossover).toBeNull();
  });

  it('allows a summary larger than the re-read', () => {
    const projection = project(defaults({ summaryPercent: 30, reread: 5_000 }));

    expect(projection.summaryTokens).toBeGreaterThan(5_000);
    expect(projection.compact).toHaveLength(31);
  });
});

describe('bestAt', () => {
  const projection = project(defaults());

  it('picks the cheapest strategy at each turn', () => {
    expect(bestAt(projection, 0)).toBe('keep');
    expect(bestAt(projection, 1)).toBe('keep');
    expect(bestAt(projection, 30)).toBe('clear');
  });

  it('includes compact later when it is on', () => {
    const withLater = project(defaults({ reread: 300_000 }), 2);

    expect(['compact', 'later']).toContain(bestAt(withLater, 30));
  });
});

describe('tableTurns', () => {
  it('lists the marks up to T and always ends on T', () => {
    expect(tableTurns(30)).toEqual([1, 5, 10, 20, 30]);
    expect(tableTurns(25)).toEqual([1, 5, 10, 20, 25]);
    expect(tableTurns(1)).toEqual([1]);
    expect(tableTurns(120)).toEqual([1, 5, 10, 20, 30, 50, 80, 120]);
    expect(tableTurns(500)).toEqual([1, 5, 10, 20, 30, 50, 80, 120, 500]);
  });
});
