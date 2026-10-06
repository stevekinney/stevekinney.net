import { describe, expect, it } from 'vitest';

import { differenceDecimals, formatNumber, intervalDecimals } from './display';

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
});
