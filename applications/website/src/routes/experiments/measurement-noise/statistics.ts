import { tQuantile, twoSidedP } from './t-distribution';

/** The confidence level every interval on the page uses. */
export const CONFIDENCE = 0.95;

export const sum = (values: readonly number[]): number => {
  let total = 0;
  for (const value of values) total += value;

  return total;
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? Number.NaN : sum(values) / values.length;

/** The sample variance, dividing by n − 1. Zero for identical values; NaN below two values. */
export const variance = (values: readonly number[]): number => {
  if (values.length < 2) return Number.NaN;

  const center = mean(values);
  let squares = 0;
  for (const value of values) squares += (value - center) ** 2;

  return squares / (values.length - 1);
};

export const standardDeviation = (values: readonly number[]): number => Math.sqrt(variance(values));

/**
 * A t interval for a difference. `degenerate` means the standard error is zero,
 * because every value in the data is the same, so the interval is a single
 * point and there is no spread to estimate the noise from.
 */
export type DifferenceTest = {
  /** A − B: positive when B is lower. */
  difference: number;
  standardError: number;
  degreesOfFreedom: number | null;
  /** The t critical value for a two-sided 95% interval. */
  critical: number | null;
  lower: number;
  upper: number;
  /** The two-sided p-value, or null when the interval is degenerate. */
  p: number | null;
  degenerate: boolean;
};

const intervalFrom = (
  difference: number,
  standardError: number,
  degreesOfFreedom: number,
): DifferenceTest => {
  if (standardError === 0 || !Number.isFinite(degreesOfFreedom)) {
    return {
      difference,
      standardError: 0,
      degreesOfFreedom: null,
      critical: null,
      lower: difference,
      upper: difference,
      p: null,
      degenerate: true,
    };
  }

  const critical = tQuantile(1 - (1 - CONFIDENCE) / 2, degreesOfFreedom);

  return {
    difference,
    standardError,
    degreesOfFreedom,
    critical,
    lower: difference - critical * standardError,
    upper: difference + critical * standardError,
    p: twoSidedP(difference / standardError, degreesOfFreedom),
    degenerate: false,
  };
};

export type WelchTest = DifferenceTest & { meanA: number; meanB: number };

/**
 * Welch's two-sample comparison of means, which doesn't assume the two groups
 * share a variance. Returns null when either group has fewer than two values,
 * because a single value says nothing about spread.
 */
export const welchTest = (a: readonly number[], b: readonly number[]): WelchTest | null => {
  if (a.length < 2 || b.length < 2) return null;

  const meanA = mean(a);
  const meanB = mean(b);
  const shareA = variance(a) / a.length;
  const shareB = variance(b) / b.length;
  const standardError = Math.sqrt(shareA + shareB);

  // Welch–Satterthwaite. When one group has no spread, its term drops out and
  // the degrees of freedom are the other group's n − 1.
  const denominator = shareA ** 2 / (a.length - 1) + shareB ** 2 / (b.length - 1);
  const degreesOfFreedom = denominator === 0 ? Number.NaN : (shareA + shareB) ** 2 / denominator;

  return { meanA, meanB, ...intervalFrom(meanA - meanB, standardError, degreesOfFreedom) };
};

export type PairedTest = DifferenceTest & {
  meanA: number;
  meanB: number;
  /** The standard deviation of the per-task differences. */
  differenceDeviation: number;
  pairs: number;
};

/** A paired t interval on per-task differences A − B, with n − 1 degrees of freedom. */
export const pairedTest = (a: readonly number[], b: readonly number[]): PairedTest | null => {
  if (a.length !== b.length || a.length < 2) return null;

  const differences = a.map((value, index) => value - b[index]);
  const differenceDeviation = standardDeviation(differences);

  return {
    meanA: mean(a),
    meanB: mean(b),
    differenceDeviation,
    pairs: a.length,
    ...intervalFrom(
      mean(differences),
      differenceDeviation / Math.sqrt(differences.length),
      differences.length - 1,
    ),
  };
};

/** One group's mean with its 95% t interval, for drawing beside its dots. Null below two values. */
export const meanInterval = (
  values: readonly number[],
): { mean: number; lower: number; upper: number } | null => {
  if (values.length < 2) return null;

  const center = mean(values);
  const half =
    tQuantile(1 - (1 - CONFIDENCE) / 2, values.length - 1) *
    (standardDeviation(values) / Math.sqrt(values.length));

  return { mean: center, lower: center - half, upper: center + half };
};
