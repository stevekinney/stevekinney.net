import type { Config } from './loop-config';

/**
 * Rounds float noise out of a dollar amount, so three iterations at $0.40 read
 * as $1.2 and not $1.2000000000000002. Nine decimals keeps every fraction of a
 * cent a person could type.
 */
export const roundDollars = (dollars: number): number => Math.round(dollars * 1e9) / 1e9;

type CostInputs = Pick<Config, 'context' | 'c0' | 'r' | 'g'>;

/** The cost of iteration `index`, counting from 0. */
export const iterationCost = (config: CostInputs, index: number): number =>
  config.context === 'fresh' ? config.c0 + config.r : config.c0 + config.g * index;

/** Fresh context: every iteration re-reads its state from disk, so each costs `c₀ + r`. */
export const freshCumulative = (n: number, c0: number, r: number): number =>
  roundDollars(n * (c0 + r));

/** Accumulating context: iteration `i` carries `g × i` of history, so n cost `n × c₀ + g × n(n − 1)/2`. */
export const accumulatingCumulative = (n: number, c0: number, g: number): number =>
  roundDollars(n * c0 + (g * n * (n - 1)) / 2);

export const cumulativeCost = (config: CostInputs, n: number): number =>
  config.context === 'fresh'
    ? freshCumulative(n, config.c0, config.r)
    : accumulatingCumulative(n, config.c0, config.g);

/**
 * The first iteration count after which a fresh context has cost strictly less
 * in total than an accumulating one: the smallest whole `n` with
 * `n > 2r/g + 1`. Returns null when the context never grows (`g = 0`).
 */
export const crossoverIteration = (r: number, g: number): number | null => {
  if (!(g > 0)) return null;

  const threshold = (2 * r) / g + 1;
  // A threshold that is a whole number up to float noise means the two are equal there.
  const whole = Math.round(threshold);
  const floor = Math.abs(threshold - whole) < 1e-9 ? whole : Math.floor(threshold);

  return Math.max(1, floor + 1);
};

/** How many iterations a budget pays for in full. */
export const iterationsWithinBudget = (config: CostInputs, budget: number): number => {
  let spent = 0;

  for (let index = 0; index < 1_000_000; index += 1) {
    spent = roundDollars(spent + iterationCost(config, index));
    if (spent > budget) return index;
  }

  return 1_000_000;
};
