/**
 * The page's only source of randomness. Every draw is a pure function of the
 * seed and where the draw is used, such as item 3's stage 2 duration, so
 * changing the failure rate never reshuffles the durations, and adding an
 * item never changes the items before it.
 */

/** What a draw is for. Each purpose gets its own independent stream. */
export type DrawPurpose = 'duration' | 'failure' | 'schema';

const PURPOSE_CODES: Record<DrawPurpose, number> = { duration: 1, failure: 2, schema: 3 };

/** Mixes one more integer into a 32-bit hash (a MurmurHash3-style finalizer). */
const mix = (hash: number, value: number): number => {
  let next = Math.imul(hash ^ (value | 0), 0x9e3779b1);
  next ^= next >>> 16;
  next = Math.imul(next, 0x85ebca6b);
  next ^= next >>> 13;
  next = Math.imul(next, 0xc2b2ae35);

  return (next ^ (next >>> 16)) >>> 0;
};

/**
 * A uniform number in [0, 1) for one draw: the seed, the item and stage it's
 * for, what it decides, and which of several draws it is, such as the
 * attempt number of a schema validation.
 */
export const uniform = (
  seed: number,
  item: number,
  stage: number,
  purpose: DrawPurpose,
  index = 0,
): number => {
  let hash = mix(0x2545f491, seed);
  hash = mix(hash, item);
  hash = mix(hash, stage);
  hash = mix(hash, PURPOSE_CODES[purpose]);
  hash = mix(hash, index);

  return hash / 4_294_967_296;
};

/**
 * A log-normal draw with the given mean and coefficient of variation
 * (standard deviation over mean), from two uniforms by the Box–Muller
 * transform. A variability of zero returns the mean.
 */
export const logNormal = (
  mean: number,
  variability: number,
  first: number,
  second: number,
): number => {
  if (variability <= 0) return mean;

  const sigmaSquared = Math.log(1 + variability * variability);
  const mu = Math.log(mean) - sigmaSquared / 2;
  // `1 - first` is in (0, 1], so the logarithm is always finite.
  const normal = Math.sqrt(-2 * Math.log(1 - first)) * Math.cos(2 * Math.PI * second);

  return Math.exp(mu + Math.sqrt(sigmaSquared) * normal);
};
