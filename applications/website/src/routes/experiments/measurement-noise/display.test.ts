import { describe, expect, it } from 'vitest';

import {
  differenceDecimals,
  formatDollars,
  formatNumber,
  formatP,
  intervalDecimals,
} from './display';

describe('display', () => {
  it('uses a real minus sign and never shows negative zero', () => {
    expect(formatNumber(-11.6, 1)).toBe('−11.6');
    expect(formatNumber(-0.01, 1)).toBe('0.0');
    expect(formatNumber(Number.NaN)).toBe('—');
  });

  it('keeps three significant figures of the interval’s width', () => {
    expect(intervalDecimals(-11.6, 26)).toBe(1);
    expect(intervalDecimals(3.83, 10.17)).toBe(2);
    expect(intervalDecimals(100, 900)).toBe(0);
    expect(intervalDecimals(0.1, 0.15)).toBe(3);
    expect(intervalDecimals(2, 2)).toBe(2);
  });

  it('shows a point estimate one decimal coarser than its interval, but at least one', () => {
    expect(differenceDecimals(-11.6, 26)).toBe(1);
    expect(differenceDecimals(3.83, 10.17)).toBe(1);
    expect(differenceDecimals(100, 900)).toBe(1);
    expect(differenceDecimals(0.1, 0.15)).toBe(2);
  });

  it('formats p-values by size', () => {
    expect(formatP(0.3849)).toBe('0.385');
    expect(formatP(0.00363)).toBe('0.0036');
    expect(formatP(0.0004)).toBe('< 0.001');
    expect(formatP(null)).toBe('—');
  });

  it('formats dollars with the shared formatter, rounding a half cent up', () => {
    expect(formatDollars(0.335)).toBe('$0.34');
    expect(formatDollars(-0.59)).toBe('−$0.59');
  });
});
