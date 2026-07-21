import { describe, expect, test } from 'vitest';

import { formatMetric } from './format-metric';

describe('formatMetric', () => {
  test('formats numbers below 10,000 with plain grouping', () => {
    expect(formatMetric(0)).toBe('0');
    expect(formatMetric(999)).toBe('999');
    expect(formatMetric(1234)).toBe('1,234');
    expect(formatMetric(9999)).toBe('9,999');
  });

  test('formats numbers at or above 10,000 with compact notation', () => {
    expect(formatMetric(10_000)).toBe('10K');
    expect(formatMetric(12_345)).toBe('12.3K');
    expect(formatMetric(1_500_000)).toBe('1.5M');
  });
});
