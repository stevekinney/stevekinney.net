import { describe, expect, it } from 'vitest';

import { formatAxisNumber, gridValues, niceMaximum, visibleLabels } from './chart-geometry';

describe('niceMaximum', () => {
  it.each([
    [6_000, 6_000],
    [5_400, 6_000],
    [4_800, 5_000],
    [7_000, 8_000],
    [112.5, 150],
    [11.25, 15],
    [1, 1],
    [0.32, 0.4],
    [0, 1],
  ])('rounds %d up to %d', (largest, maximum) => {
    expect(niceMaximum(largest)).toBeCloseTo(maximum, 10);
  });
});

describe('gridValues', () => {
  it('spaces five lines from zero to the top', () => {
    expect(gridValues(10_000)).toEqual([0, 2_500, 5_000, 7_500, 10_000]);
  });
});

describe('visibleLabels', () => {
  it('shows every label when they fit', () => {
    expect([...visibleLabels(10, 600, 30)].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('thins the labels on a narrow chart and keeps the first and the last', () => {
    const shown = visibleLabels(20, 260, 26);

    expect(shown.has(0)).toBe(true);
    expect(shown.has(19)).toBe(true);
    expect(shown.size).toBeLessThan(20);
    expect(shown.size).toBeGreaterThan(4);
    // No two shown labels sit next to each other.
    const sorted = [...shown].sort((a, b) => a - b);
    expect(sorted.slice(1).every((value, index) => value - sorted[index] >= 2)).toBe(true);
  });
});

describe('formatAxisNumber', () => {
  it('keeps axis labels short', () => {
    expect(formatAxisNumber(0)).toBe('0');
    expect(formatAxisNumber(2.5)).toBe('2.5');
    expect(formatAxisNumber(900)).toBe('900');
    expect(formatAxisNumber(2_500)).toBe('2.5K');
    expect(formatAxisNumber(10_000)).toBe('10K');
    expect(formatAxisNumber(1_500_000)).toBe('1.5M');
  });
});
