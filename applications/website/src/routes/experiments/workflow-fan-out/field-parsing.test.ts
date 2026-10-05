import { describe, expect, it } from 'vitest';

import { formatFieldNumber, parseFieldNumber } from './field-parsing';

describe('parseFieldNumber', () => {
  it('reads whole numbers with digit grouping', () => {
    expect(parseFieldNumber('4,096', 'integer')).toBe(4_096);
    expect(parseFieldNumber('2.5', 'integer')).toBeNull();
    expect(parseFieldNumber('lots', 'integer')).toBeNull();
  });

  it('reads decimals', () => {
    expect(parseFieldNumber('0.5', 'decimal')).toBe(0.5);
    expect(parseFieldNumber('.5', 'decimal')).toBe(0.5);
    expect(parseFieldNumber('-1', 'decimal')).toBeNull();
  });

  it('reads a percentage as a fraction, with or without the sign', () => {
    expect(parseFieldNumber('6%', 'percent')).toBe(0.06);
    expect(parseFieldNumber('6', 'percent')).toBe(0.06);
    expect(parseFieldNumber('12.5%', 'percent')).toBe(0.125);
  });
});

describe('formatFieldNumber', () => {
  it('formats each kind', () => {
    expect(formatFieldNumber(0.06, 'percent')).toBe('6%');
    expect(formatFieldNumber(10_000, 'integer')).toBe('10,000');
    expect(formatFieldNumber(0.5, 'decimal')).toBe('0.5');
  });
});
