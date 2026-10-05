import { describe, expect, it } from 'vitest';

import { formatCost } from '$lib/experiments/format';

import {
  accumulatingCumulative,
  crossoverIteration,
  cumulativeCost,
  freshCumulative,
  iterationCost,
  iterationsWithinBudget,
  roundDollars,
} from './cost';
import { defaultConfig } from './loop-config';

const { c0, r, g } = defaultConfig();

describe('acceptance check 4: fresh against accumulating context', () => {
  it.each([
    [3, '$1.20', '$1.14'],
    [4, '$1.60', '$1.68'],
    [5, '$2.00', '$2.30'],
  ])('after %i iterations: fresh %s, accumulating %s', (n, fresh, accumulating) => {
    expect(formatCost(freshCumulative(n, c0, r))).toBe(fresh);
    expect(formatCost(accumulatingCumulative(n, c0, g))).toBe(accumulating);
  });

  it('has exact totals, without float noise', () => {
    expect(freshCumulative(3, c0, r)).toBe(1.2);
    expect(accumulatingCumulative(3, c0, g)).toBe(1.14);
    expect(accumulatingCumulative(5, c0, g)).toBe(2.3);
  });

  it('says fresh is cheaper cumulatively from iteration 4 on, because n > 2r/g + 1 = 3.5', () => {
    expect((2 * r) / g + 1).toBeCloseTo(3.5, 12);
    expect(crossoverIteration(r, g)).toBe(4);
    expect(freshCumulative(3, c0, r)).toBeGreaterThan(accumulatingCumulative(3, c0, g));
    expect(freshCumulative(4, c0, r)).toBeLessThan(accumulatingCumulative(4, c0, g));
  });
});

describe('the cost model', () => {
  it('charges c₀ + g × i at iteration i, counting from 0', () => {
    const accumulating = { context: 'accumulating', c0, r, g } as const;

    expect(iterationCost(accumulating, 0)).toBe(0.3);
    expect(roundDollars(iterationCost(accumulating, 2))).toBe(0.46);
    expect(cumulativeCost(accumulating, 4)).toBe(1.68);
  });

  it('charges c₀ + r every iteration in a fresh context', () => {
    const fresh = { context: 'fresh', c0, r, g } as const;

    expect(roundDollars(iterationCost(fresh, 0))).toBe(0.4);
    expect(roundDollars(iterationCost(fresh, 99))).toBe(0.4);
  });

  it('has no crossover when the context never grows', () => {
    expect(crossoverIteration(0.1, 0)).toBeNull();
  });

  it('needs strictly cheaper, so a tie at 2r/g + 1 moves the crossover one later', () => {
    // 2 × 0.08 / 0.08 + 1 = 3, where the two totals are equal.
    expect(freshCumulative(3, 0.3, 0.08)).toBe(accumulatingCumulative(3, 0.3, 0.08));
    expect(crossoverIteration(0.08, 0.08)).toBe(4);
  });

  it('counts how many whole iterations a budget pays for', () => {
    const fresh = { context: 'fresh', c0, r, g } as const;

    expect(iterationsWithinBudget(fresh, 5)).toBe(12);
    expect(iterationsWithinBudget(fresh, 0.25)).toBe(0);
  });

  it('shows an exact half cent rounded up', () => {
    expect(formatCost(roundDollars(0.3 + 0.035))).toBe('$0.34');
  });
});
