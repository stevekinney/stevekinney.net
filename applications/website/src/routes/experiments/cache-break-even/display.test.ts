import { describe, expect, it } from 'vitest';

import { formatDollars, formatRatio, formatSignedDollars, formatTokens } from './display';

describe('formatTokens', () => {
  it('keeps three significant digits', () => {
    expect(formatTokens(562_500)).toBe('563K');
    expect(formatTokens(1_250_000)).toBe('1.25M');
    expect(formatTokens(312_000)).toBe('312K');
    expect(formatTokens(1_500)).toBe('1.5K');
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(50_000_000)).toBe('50M');
  });

  it('shows an unbounded break-even as infinity', () => {
    expect(formatTokens(Number.POSITIVE_INFINITY)).toBe('∞');
  });
});

describe('money', () => {
  it('shows dollars to the cent', () => {
    expect(formatDollars(2)).toBe('$2.00');
    expect(formatDollars(1.875)).toBe('$1.88');
    expect(formatDollars(1234.5)).toBe('$1,234.50');
  });

  it('signs differences with a real minus and never shows negative zero', () => {
    expect(formatSignedDollars(0.25)).toBe('+$0.25');
    expect(formatSignedDollars(-3.125)).toBe('−$3.13');
    expect(formatSignedDollars(1e-14)).toBe('+$0.00');
    expect(formatSignedDollars(-1e-14)).toBe('+$0.00');
  });

  it('shows ratios to two decimals', () => {
    expect(formatRatio(0.5)).toBe('0.50');
    expect(formatRatio(2.2)).toBe('2.20');
  });
});
