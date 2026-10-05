/**
 * The normal and Student's t distributions, written out by hand so the page
 * needs no statistics package. Every function is pure.
 */

/** Past this many degrees of freedom, the t distribution is the normal distribution to 9 places. */
const NORMAL_LIMIT = 1e7;

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** The natural log of the gamma function, by the Lanczos approximation (g = 7). */
export const logGamma = (x: number): number => {
  if (x < 0.5) {
    // The reflection formula keeps the approximation accurate below one half.
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  const shifted = x - 1;
  let sum = LANCZOS[0];
  for (let index = 1; index < LANCZOS.length; index += 1) sum += LANCZOS[index] / (shifted + index);

  const t = shifted + 7.5;

  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
};

/** The continued fraction for the incomplete beta function, by the modified Lentz method. */
const betaContinuedFraction = (x: number, a: number, b: number): number => {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= 500; m += 1) {
    const twoM = 2 * m;
    const even = (m * (b - m) * x) / ((a + twoM - 1) * (a + twoM));

    d = 1 + even * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + even / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    result *= d * c;

    const odd = (-(a + m) * (a + b + m) * x) / ((a + twoM) * (a + twoM + 1));
    d = 1 + odd * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + odd / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;

    const step = d * c;
    result *= step;
    if (Math.abs(step - 1) < 1e-15) break;
  }

  return result;
};

/** The regularized incomplete beta function I_x(a, b). */
export const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );

  // The continued fraction converges fastest on this side of the mean.
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(x, a, b)) / a
    : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
};

/** The complementary error function, to about 1.2e-7 (Numerical Recipes' Chebyshev fit). */
const erfc = (x: number): number => {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const value =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );

  return x >= 0 ? value : 2 - value;
};

/** The standard normal distribution's cumulative probability. */
export const normalCdf = (z: number): number => 0.5 * erfc(-z / Math.SQRT2);

/**
 * The standard normal distribution's quantile, by Acklam's rational
 * approximation, which is good to about 1e-9.
 */
export const normalQuantile = (p: number): number => {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;

    return Number.NaN;
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));

    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > 1 - low) return -normalQuantile(1 - p);

  const q = p - 0.5;
  const r = q * q;

  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
};

/** Student's t cumulative probability at `t` with `df` degrees of freedom, which needn't be whole. */
export const tCdf = (t: number, df: number): number => {
  if (Number.isNaN(t) || !(df > 0)) return Number.NaN;
  if (df >= NORMAL_LIMIT) return normalCdf(t);
  if (t === Infinity) return 1;
  if (t === -Infinity) return 0;

  const tail = 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5);

  return t > 0 ? 1 - tail : tail;
};

/**
 * The two-sided p-value for a t statistic: the chance of a value at least this
 * far from zero, in either direction. Computed from the incomplete beta
 * directly, so small p-values keep their precision.
 */
export const twoSidedP = (t: number, df: number): number => {
  if (Number.isNaN(t) || !(df > 0)) return Number.NaN;
  if (!Number.isFinite(t)) return 0;
  if (df >= NORMAL_LIMIT) return 2 * normalCdf(-Math.abs(t));

  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
};

/**
 * Student's t quantile: the value with probability `p` below it. Found by
 * bisection on `tCdf`, which is slow by numerical standards but exact to the
 * last few digits and never fails to converge.
 */
export const tQuantile = (p: number, df: number): number => {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;

    return Number.NaN;
  }
  if (!(df > 0)) return Number.NaN;
  if (df >= NORMAL_LIMIT) return normalQuantile(p);
  if (p === 0.5) return 0;
  if (p < 0.5) return -tQuantile(1 - p, df);

  let low = 0;
  let high = Math.max(1, normalQuantile(p));
  while (tCdf(high, df) < p) high *= 2;

  for (let iteration = 0; iteration < 200 && high - low > 1e-12 * Math.max(1, high); iteration++) {
    const middle = (low + high) / 2;
    if (tCdf(middle, df) < p) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
};
