import { describe, expect, it } from 'vitest';

import { compare, describeComparison, EXAMPLE, parseMinutes, readGrid } from './compare';

describe('the same five tasks, two designs', () => {
  it('can’t tell them apart when the ten times are treated as different tasks', () => {
    const comparison = compare(EXAMPLE.a, EXAMPLE.b, false)!;
    const text = describeComparison(comparison);

    expect(comparison.kind).toBe('cant-tell');
    expect(comparison.test.difference).toBeCloseTo(7, 10);
    expect(comparison.test.standardError).toBeCloseTo(Math.sqrt(79.3), 10);
    expect(comparison.test.degreesOfFreedom).toBeCloseTo(7.768, 3);
    expect(text.headline).toBe('Can’t tell.');
    expect(text.body).toBe(
      'The data is consistent with anything from B being 13.6 minutes slower to 27.6 minutes faster per task.',
    );
    expect(text.plan).toBe(
      'You’d need about 64 tasks per condition to reliably see a difference this size (7.0 minutes).',
    );
  });

  it('tells them apart when each task is compared with itself', () => {
    const comparison = compare(EXAMPLE.a, EXAMPLE.b, true)!;
    const text = describeComparison(comparison);

    expect(comparison.kind).toBe('distinguishable');
    expect(comparison.test.standardError).toBeCloseTo(1.1402, 4);
    expect(comparison.test.degreesOfFreedom).toBe(4);
    expect(text.body).toBe(
      'B is 3.83–10.17 minutes faster per task than A. The 95% interval leaves out zero.',
    );
    expect(text.plan).toBeNull();
  });
});

describe('verdict language', () => {
  it('describes B as slower when the interval is all below zero', () => {
    const comparison = compare([10, 11, 12], [20, 21, 23], true)!;

    expect(describeComparison(comparison).body).toMatch(
      /^B is .* minutes slower per task than A\./,
    );
  });

  it('needs at least two tasks a side', () => {
    expect(compare([10], [12], false)).toBeNull();
    expect(compare([10], [12], true)).toBeNull();
  });

  it('plans nothing when the two means are identical', () => {
    expect(describeComparison(compare([10, 20], [20, 10], false)!).plan).toBeNull();
  });
});

describe('the typed grid', () => {
  it('reads blanks as null and anything else that isn’t minutes as invalid', () => {
    expect(parseMinutes(' 42 ')).toBe(42);
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes('soon')).toBeUndefined();
    expect(parseMinutes('-3')).toBeUndefined();
  });

  it('keeps only complete rows when paired, and every number when not', () => {
    const rows = [
      { a: '40', b: '35' },
      { a: '55', b: '' },
      { a: '', b: '26' },
      { a: '70', b: '60' },
    ];

    expect(readGrid(rows, true)).toEqual({ a: [40, 70], b: [35, 60] });
    expect(readGrid(rows, false)).toEqual({ a: [40, 55, 70], b: [35, 26, 60] });
  });
});
