import { describe, expect, it } from 'vitest';

import { defaultState } from './calculator-state';
import { buildOptions, sortOptions } from './options';
import { defaultPricing } from './pricing';

const rows = buildOptions(defaultState, defaultPricing);

describe('buildOptions', () => {
  it('lists every model at every effort level', () => {
    expect(rows).toHaveLength(defaultPricing.models.length * defaultPricing.efforts.length);
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it('prices each destination from the current starting point', () => {
    const sonnet = rows.find((row) => row.key === 'sonnet-5:high');

    expect(sonnet?.evaluation.cost).toBeCloseTo(2, 10);
    expect(sonnet?.evaluation.net).toBeCloseTo(0.25, 10);
  });

  it('includes the row that changes nothing', () => {
    expect(rows.find((row) => row.key === 'opus-5:high')?.evaluation.unchanged).toBe(true);
  });

  it('ignores a ratio override, which belongs to the chosen destination', () => {
    const overridden = buildOptions({ ...defaultState, ratioOverride: 0.1 }, defaultPricing);

    expect(overridden.map((row) => row.evaluation.net)).toEqual(
      rows.map((row) => row.evaluation.net),
    );
  });
});

describe('sortOptions', () => {
  it('sorts by net, best first', () => {
    const sorted = sortOptions(rows, 'net', 'descending');
    const nets = sorted.map((row) => row.evaluation.net);

    expect(nets).toEqual([...nets].sort((first, second) => second - first));
    expect(sorted[0].evaluation.net).toBeGreaterThan(0);
  });

  it('sorts rows that never pay back after the rest, in either direction', () => {
    for (const direction of ['ascending', 'descending'] as const) {
      const sorted = sortOptions(rows, 'breakEven', direction);
      const firstNever = sorted.findIndex((row) => row.evaluation.breakEvenOutput === null);

      expect(firstNever).toBeGreaterThan(0);
      expect(sorted.slice(firstNever).every((row) => row.evaluation.breakEvenOutput === null)).toBe(
        true,
      );
    }
  });

  it('keeps the table order for destination and does not change its input', () => {
    const before = rows.map((row) => row.key);

    expect(sortOptions(rows, 'destination', 'ascending').map((row) => row.key)).toEqual(before);
    expect(rows.map((row) => row.key)).toEqual(before);
  });
});
