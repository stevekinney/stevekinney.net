import { describe, expect, it } from 'vitest';

import {
  formatAxisDollars,
  gridValues,
  nudgeApart,
  tickStep,
  xTicks,
  yAxisMaximum,
} from './chart-geometry';

describe('tickStep', () => {
  it.each([
    [5, 2],
    [12, 2],
    [13, 5],
    [30, 5],
    [31, 10],
    [60, 10],
    [61, 20],
    [500, 20],
  ])('spaces ticks for %i turns every %i', (turns, step) => {
    expect(tickStep(turns)).toBe(step);
  });
});

describe('xTicks', () => {
  it('starts at zero and stops at or before the last turn', () => {
    expect(xTicks(30)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(xTicks(7)).toEqual([0, 2, 4, 6]);
    expect(xTicks(120)).toEqual([0, 20, 40, 60, 80, 100, 120]);
  });
});

describe('the y axis', () => {
  it('adds 8% headroom', () => {
    expect(yAxisMaximum(100)).toBeCloseTo(108, 10);
    expect(yAxisMaximum(0)).toBe(1);
  });

  it('draws five gridlines from zero to the top', () => {
    expect(gridValues(100)).toEqual([0, 25, 50, 75, 100]);
  });

  it('keeps labels short', () => {
    expect(formatAxisDollars(0)).toBe('$0');
    expect(formatAxisDollars(2.78)).toBe('$2.78');
    expect(formatAxisDollars(27.8)).toBe('$27.8');
    expect(formatAxisDollars(30)).toBe('$30');
    expect(formatAxisDollars(278.4)).toBe('$278');
  });
});

describe('nudgeApart', () => {
  const gaps = (positions: number[]): number[] => {
    const sorted = [...positions].sort((a, b) => a - b);

    return sorted.slice(1).map((position, index) => position - sorted[index]);
  };

  it('leaves labels that are already apart where they are', () => {
    expect(nudgeApart([10, 40, 90], 15, 0, 100)).toEqual([10, 40, 90]);
  });

  it('spreads labels that overlap so none sit closer than the gap', () => {
    const result = nudgeApart([50, 52, 53], 15, 0, 200);

    expect(Math.min(...gaps(result))).toBeGreaterThanOrEqual(15);
    expect(result[0]).toBeLessThan(result[1]);
    expect(result[1]).toBeLessThan(result[2]);
  });

  it('keeps the order of the labels it was given, whatever order they arrive in', () => {
    const result = nudgeApart([60, 20, 22], 15, 0, 200);

    expect(result[1]).toBeLessThan(result[2]);
    expect(result[2]).toBeLessThan(result[0]);
    expect(Math.min(...gaps(result))).toBeGreaterThanOrEqual(15);
  });

  it('pushes labels back up when they would run off the bottom', () => {
    const result = nudgeApart([95, 96, 97], 15, 0, 100);

    expect(Math.max(...result)).toBeLessThanOrEqual(100);
    expect(Math.min(...gaps(result))).toBeGreaterThanOrEqual(15);
  });

  it('pulls a label inside the bounds', () => {
    expect(nudgeApart([-20], 15, 0, 100)).toEqual([0]);
    expect(nudgeApart([220], 15, 0, 100)).toEqual([100]);
  });
});
