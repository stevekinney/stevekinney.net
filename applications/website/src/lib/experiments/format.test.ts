import { describe, expect, it } from 'vitest';

import {
  formatCalendarDate,
  formatCompactTokenCount,
  formatCost,
  formatPrice,
  formatTokenCount,
  parseTokenCount,
} from './format';

describe('parseTokenCount', () => {
  it('reads plain and grouped numbers', () => {
    expect(parseTokenCount('1500000')).toBe(1_500_000);
    expect(parseTokenCount(' 1,500,000 ')).toBe(1_500_000);
    expect(parseTokenCount('1_500_000')).toBe(1_500_000);
  });

  it('reads shorthand suffixes in either case', () => {
    expect(parseTokenCount('250k')).toBe(250_000);
    expect(parseTokenCount('1.5M')).toBe(1_500_000);
    expect(parseTokenCount('2b')).toBe(2_000_000_000);
    expect(parseTokenCount('.5m')).toBe(500_000);
  });

  it('treats an empty field as zero', () => {
    expect(parseTokenCount('')).toBe(0);
    expect(parseTokenCount('   ')).toBe(0);
  });

  it('rounds fractional tokens to whole tokens', () => {
    expect(parseTokenCount('1.2345k')).toBe(1_235);
  });

  it('rejects negative numbers, unknown suffixes, and other text', () => {
    expect(parseTokenCount('-5')).toBeNull();
    expect(parseTokenCount('5x')).toBeNull();
    expect(parseTokenCount('lots')).toBeNull();
    expect(parseTokenCount('1.2.3')).toBeNull();
  });

  it('rejects counts too large to represent exactly', () => {
    expect(parseTokenCount('99999999999b')).toBeNull();
  });
});

describe('formatting', () => {
  it('groups token counts and abbreviates them for headlines', () => {
    expect(formatTokenCount(1_234_567)).toBe('1,234,567');
    expect(formatCompactTokenCount(1_500_000)).toBe('1.5M');
  });

  it.each([
    [0, '0'],
    [850, '850'],
    [1_000, '1K'],
    [12_969, '13K'],
    [18_863, '18.9K'],
    [20_000, '20K'],
    [312_693, '313K'],
    [400_000, '400K'],
    [999_600, '1M'],
    [1_000_000, '1M'],
    [1_250_000, '1.25M'],
    [2_201_551, '2.2M'],
  ])('writes %i as %s to three significant digits', (count, text) => {
    expect(formatCompactTokenCount(count)).toBe(text);
  });

  it('shows prices with two or three decimals, as the pricing table does', () => {
    expect(formatPrice(10)).toBe('$10.00');
    expect(formatPrice(0.206)).toBe('$0.206');
    expect(formatPrice(0.003)).toBe('$0.003');
  });

  it('keeps costs under a cent visible instead of rounding them to zero', () => {
    expect(formatCost(0)).toBe('$0.00');
    expect(formatCost(0.0012345)).toBe('$0.0012');
    expect(formatCost(6265.804)).toBe('$6,265.80');
  });

  it('formats a calendar date the same way in every time zone', () => {
    expect(formatCalendarDate('2026-10-04')).toBe('October 4, 2026');
  });
});
