/** Returns a number in [0, 1). Every random draw on the page comes from one of these. */
export type Random = () => number;

/** The largest seed a person can type. Seeds are unsigned 32-bit integers. */
export const MAXIMUM_SEED = 4_294_967_295;

/**
 * A small seeded generator (mulberry32), so the same seed gives the same runs on
 * every visit, in every browser, and in the tests.
 */
export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
