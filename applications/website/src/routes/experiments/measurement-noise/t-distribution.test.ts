import { describe, expect, it } from 'vitest';

import {
  incompleteBeta,
  logGamma,
  normalCdf,
  normalQuantile,
  tCdf,
  tQuantile,
  twoSidedP,
} from './t-distribution';

describe('logGamma', () => {
  it('matches factorials and Γ(½) = √π', () => {
    expect(logGamma(1)).toBeCloseTo(0, 12);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(logGamma(11)).toBeCloseTo(Math.log(3_628_800), 10);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
  });
});

describe('incompleteBeta', () => {
  it('is x for a = b = 1, and symmetric at one half', () => {
    expect(incompleteBeta(0.3, 1, 1)).toBeCloseTo(0.3, 12);
    expect(incompleteBeta(0.5, 3, 3)).toBeCloseTo(0.5, 12);
    expect(incompleteBeta(0, 2, 3)).toBe(0);
    expect(incompleteBeta(1, 2, 3)).toBe(1);
  });

  it('matches a closed form: I_x(2, 1) = x²', () => {
    expect(incompleteBeta(0.7, 2, 1)).toBeCloseTo(0.49, 12);
  });
});

describe('acceptance 4: the t quantile matches reference values to three decimals', () => {
  // Two-sided 95% critical values from a standard t table.
  const table: [number, number][] = [
    [1, 12.706],
    [2, 4.303],
    [3, 3.182],
    [4, 2.776],
    [5, 2.571],
    [10, 2.228],
    [30, 2.042],
    [120, 1.98],
  ];

  for (const [df, expected] of table) {
    it(`t₀.₉₇₅ at ${df} df is ${expected}`, () => {
      expect(Number(tQuantile(0.975, df).toFixed(3))).toBe(expected);
    });
  }

  it('tends to 1.960 as df → ∞', () => {
    expect(Number(tQuantile(0.975, Infinity).toFixed(3))).toBe(1.96);
    expect(Number(tQuantile(0.975, 1e6).toFixed(3))).toBe(1.96);
    expect(Number(tQuantile(0.975, 1e9).toFixed(3))).toBe(1.96);
  });

  it('matches other tail probabilities from the table', () => {
    expect(Number(tQuantile(0.95, 1).toFixed(3))).toBe(6.314);
    expect(Number(tQuantile(0.95, 10).toFixed(3))).toBe(1.812);
    expect(Number(tQuantile(0.995, 5).toFixed(3))).toBe(4.032);
    expect(Number(tQuantile(0.9995, 1).toFixed(1))).toBe(636.6);
  });

  it('handles fractional degrees of freedom, between its whole neighbors', () => {
    const value = tQuantile(0.975, 6.04);

    expect(value).toBeLessThan(tQuantile(0.975, 6));
    expect(value).toBeGreaterThan(tQuantile(0.975, 7));
    expect(Number(value.toFixed(3))).toBe(2.443);
  });

  it('is symmetric, zero at the median, and infinite at the ends', () => {
    expect(tQuantile(0.025, 4)).toBeCloseTo(-tQuantile(0.975, 4), 10);
    expect(tQuantile(0.5, 7)).toBe(0);
    expect(tQuantile(1, 3)).toBe(Infinity);
    expect(tQuantile(0, 3)).toBe(-Infinity);
    expect(tQuantile(0.5, 0)).toBeNaN();
  });
});

describe('tCdf', () => {
  it('matches closed forms', () => {
    // One degree of freedom is the Cauchy distribution: F(1) = 3/4.
    expect(tCdf(1, 1)).toBeCloseTo(0.75, 10);
    // Two degrees of freedom: F(t) = ½ + t / (2√(2 + t²)).
    expect(tCdf(2, 2)).toBeCloseTo(0.5 + 2 / (2 * Math.sqrt(6)), 10);
    expect(tCdf(0, 9)).toBe(0.5);
    expect(tCdf(-1, 1)).toBeCloseTo(0.25, 10);
  });

  it('inverts the quantile', () => {
    for (const df of [1, 2.5, 6.04, 30, 500]) {
      for (const p of [0.01, 0.2, 0.9, 0.999]) {
        expect(tCdf(tQuantile(p, df), df)).toBeCloseTo(p, 9);
      }
    }
  });
});

describe('twoSidedP', () => {
  it('is 1 at zero, 0.05 at the critical value, and 0 at infinity', () => {
    expect(twoSidedP(0, 5)).toBeCloseTo(1, 12);
    expect(twoSidedP(tQuantile(0.975, 5), 5)).toBeCloseTo(0.05, 10);
    expect(twoSidedP(Infinity, 5)).toBe(0);
    expect(twoSidedP(-2, 8)).toBeCloseTo(twoSidedP(2, 8), 12);
  });
});

describe('the normal distribution', () => {
  it('matches reference values', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 6);
    expect(normalQuantile(0.8)).toBeCloseTo(0.841621, 6);
    expect(normalQuantile(0.5)).toBeCloseTo(0, 9);
    expect(normalQuantile(0.001)).toBeCloseTo(-3.090232, 5);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
  });
});
