import { describe, expect, it } from 'vitest';

import { jitter, niceDomain, niceStep, scale, ticks } from './chart-scale';

describe('chart scales', () => {
  it('finds the domain of 300,000 values without spreading them into arguments', () => {
    const values = Array.from({ length: 300_000 }, (_, index) => index / 1_000);

    expect(niceDomain([Number.NaN, ...values, Number.POSITIVE_INFINITY])).toEqual({
      min: 0,
      max: 300,
      step: 100,
    });
  });

  it('picks steps of 1, 2, or 5 times a power of ten', () => {
    expect(niceStep(40)).toBe(10);
    expect(niceStep(37.6)).toBe(10);
    expect(niceStep(6.3)).toBe(2);
    expect(niceStep(0.9)).toBe(0.2);
    expect(niceStep(0)).toBe(1);
  });

  it('covers the values and zero, in whole steps', () => {
    expect(niceDomain([-11.6, 26], { includeZero: true })).toEqual({ min: -20, max: 30, step: 10 });
    expect(niceDomain([3.83, 10.17], { includeZero: true })).toEqual({ min: 0, max: 15, step: 5 });
    expect(niceDomain([5, 5])).toEqual({ min: 4, max: 6, step: 0.5 });
  });

  it('lists ticks without drift', () => {
    expect(ticks(0, 1, 0.2)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(ticks(-20, 30, 10)).toEqual([-20, -10, 0, 10, 20, 30]);
  });

  it('maps a domain to a range', () => {
    const x = scale(0, 10, 100, 200);

    expect(x(5)).toBe(150);
    expect(scale(3, 3, 0, 10)(3)).toBe(5);
  });

  it('jitters within ±1', () => {
    for (let index = 0; index < 100; index += 1) {
      expect(Math.abs(jitter(index))).toBeLessThanOrEqual(1);
    }
    expect(jitter(1)).not.toBe(jitter(2));
  });
});
