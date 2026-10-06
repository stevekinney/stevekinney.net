/**
 * A percentile bootstrap. All randomness on the page comes from the seeded
 * generator here, so the same seed and data always give the same interval.
 */

export const BOOTSTRAP_RESAMPLES = 10_000;
/**
 * The most index draws one bootstrap may make: rows × resamples. Ten thousand
 * resamples of 100,000 rows is a billion draws, which keeps a laptop busy for
 * about a minute, so a large file gets fewer resamples or a subsample instead.
 */
export const BOOTSTRAP_WORK_BUDGET = 20_000_000;
/** Fewer resamples than this make the 2.5% and 97.5% percentiles too jumpy to trust. */
export const MIN_BOOTSTRAP_RESAMPLES = 1_000;
export const DEFAULT_SEED = 20_261_004;
export const MAX_SEED = 4_294_967_295;

/** Mulberry32: a small, fast, seeded generator of numbers in [0, 1). */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** The k-th smallest value, rearranging `values` in place. Hoare's selection, linear on average. */
const select = (values: Float64Array, k: number, length: number): number => {
  let left = 0;
  let right = length - 1;

  while (left < right) {
    const pivot = values[(left + right) >>> 1];
    let i = left;
    let j = right;

    while (i <= j) {
      while (values[i] < pivot) i += 1;
      while (values[j] > pivot) j -= 1;
      if (i <= j) {
        const swap = values[i];
        values[i] = values[j];
        values[j] = swap;
        i += 1;
        j -= 1;
      }
    }

    if (k <= j) right = j;
    else if (k >= i) left = i;
    else return values[k];
  }

  return values[k];
};

/** The median of the first `length` values, rearranging them. */
export const medianInPlace = (values: Float64Array, length: number): number => {
  const middle = length >>> 1;
  const upper = select(values, middle, length);
  if (length % 2 === 1) return upper;

  // After selection, everything before `middle` is no larger than `upper`.
  let lower = -Infinity;
  for (let index = 0; index < middle; index += 1) lower = Math.max(lower, values[index]);

  return (lower + upper) / 2;
};

/** The value at quantile `q` of sorted values, interpolating between neighbors. */
export const quantileSorted = (sorted: ArrayLike<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN;

  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.min(sorted.length - 1, below + 1);

  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
};

export type BootstrapInterval = {
  seed: number;
  resamples: number;
  /** Rows in the data, both conditions together. */
  rows: number;
  /** Rows the bootstrap resampled: fewer than `rows` when it ran on a seeded subsample. */
  sampledRows: number;
  /** Resamples whose statistic could be computed, such as a cost per accepted with nothing accepted. */
  usable: number;
  lower: number;
  upper: number;
};

/**
 * Work that runs in slices, so a large file keeps the page responsive. Call
 * `advance` until it returns true, then `finish`.
 */
export type BootstrapJob = {
  total: number;
  completed: () => number;
  /** Runs up to `count` more resamples. Returns true once every resample has run. */
  advance: (count: number) => boolean;
  finish: () => BootstrapInterval;
};

export type BootstrapPlan = {
  resamples: number;
  /** How many of condition A's rows to resample. */
  sampleA: number;
  sampleB: number;
};

/**
 * How much bootstrap the data can afford. Keeps 10,000 resamples while
 * (rows A + rows B) × resamples fits `BOOTSTRAP_WORK_BUDGET`, then lowers the
 * resamples, rounded down to a hundred, to no fewer than 1,000. Past that, it
 * resamples a subsample of 20,000 rows: a condition that fits in half of it
 * stays whole and the other gets the rest, and otherwise each keeps its share.
 * Paired data is subsampled by task, so both sides keep the same tasks.
 */
export const planBootstrap = (sizeA: number, sizeB: number, paired = false): BootstrapPlan => {
  const rows = sizeA + sizeB;
  if (rows * BOOTSTRAP_RESAMPLES <= BOOTSTRAP_WORK_BUDGET) {
    return { resamples: BOOTSTRAP_RESAMPLES, sampleA: sizeA, sampleB: sizeB };
  }

  const affordable = Math.floor(BOOTSTRAP_WORK_BUDGET / rows / 100) * 100;
  if (affordable >= MIN_BOOTSTRAP_RESAMPLES) {
    return { resamples: affordable, sampleA: sizeA, sampleB: sizeB };
  }

  const target = Math.floor(BOOTSTRAP_WORK_BUDGET / MIN_BOOTSTRAP_RESAMPLES);
  if (paired) {
    const tasks = Math.min(sizeA, Math.floor(target / 2));

    return { resamples: MIN_BOOTSTRAP_RESAMPLES, sampleA: tasks, sampleB: tasks };
  }

  // A small condition stays whole, or its median would come from a handful of rows.
  const half = Math.floor(target / 2);
  if (sizeA <= half)
    return { resamples: MIN_BOOTSTRAP_RESAMPLES, sampleA: sizeA, sampleB: target - sizeA };
  if (sizeB <= half)
    return { resamples: MIN_BOOTSTRAP_RESAMPLES, sampleA: target - sizeB, sampleB: sizeB };

  const sampleA = Math.round((target * sizeA) / rows);

  return { resamples: MIN_BOOTSTRAP_RESAMPLES, sampleA, sampleB: target - sampleA };
};

/**
 * Picks `count` of the indices below `size` without replacement, with a
 * partial Fisher–Yates shuffle. The same random stream gives the same picks.
 */
const pickIndices = (size: number, count: number, random: () => number): Int32Array => {
  const indices = new Int32Array(size);
  for (let index = 0; index < size; index += 1) indices[index] = index;
  for (let index = 0; index < count; index += 1) {
    const other = index + Math.floor(random() * (size - index));
    const swap = indices[index];
    indices[index] = indices[other];
    indices[other] = swap;
  }

  return indices.subarray(0, count);
};

/**
 * The rows a bootstrap resamples: all of them, or a subsample drawn from its
 * own stream of the seed, so the resampling stream is the same either way.
 */
const subsample = <T>(
  a: readonly T[],
  b: readonly T[],
  plan: BootstrapPlan,
  paired: boolean,
  seed: number,
): [readonly T[], readonly T[]] => {
  if (plan.sampleA === a.length && plan.sampleB === b.length) return [a, b];

  const random = createRandom((seed ^ 0x5bd1e995) >>> 0);
  const indicesA = pickIndices(a.length, plan.sampleA, random);
  const indicesB = paired ? indicesA : pickIndices(b.length, plan.sampleB, random);

  return [Array.from(indicesA, (index) => a[index]), Array.from(indicesB, (index) => b[index])];
};

/** What to say next to an interval the budget cut down, or null when it ran in full. */
export const budgetNote = (interval: BootstrapInterval): string | null => {
  const count = (value: number): string => value.toLocaleString('en-US');
  const rows = `to stay responsive on ${count(interval.rows)} rows.`;

  if (interval.sampledRows < interval.rows) {
    return `Bootstrapped with ${count(interval.resamples)} resamples on a seeded subsample of ${count(interval.sampledRows)} rows ${rows}`;
  }
  if (interval.resamples < BOOTSTRAP_RESAMPLES) {
    return `Bootstrapped with ${count(interval.resamples)} resamples ${rows}`;
  }

  return null;
};

type Statistic = (indicesA: Int32Array, indicesB: Int32Array) => number;

const checkSizes = (sizeA: number, sizeB: number, paired: boolean): void => {
  if (sizeA === 0 || sizeB === 0) {
    throw new RangeError('A bootstrap needs at least one value in each condition.');
  }
  if (paired && sizeA !== sizeB) {
    throw new RangeError(
      `Paired data needs the same number of values in each condition, not ${sizeA} and ${sizeB}.`,
    );
  }
};

const createJob = (
  sizeA: number,
  sizeB: number,
  paired: boolean,
  seed: number,
  resamples: number,
  rows: number,
  statistic: Statistic,
): BootstrapJob => {
  checkSizes(sizeA, sizeB, paired);

  const random = createRandom(seed);
  const indicesA = new Int32Array(sizeA);
  const indicesB = new Int32Array(sizeB);
  const results = new Float64Array(resamples);
  let done = 0;
  let usable = 0;

  return {
    total: resamples,
    completed: () => done,
    advance: (count) => {
      const stop = Math.min(resamples, done + count);

      for (; done < stop; done += 1) {
        for (let index = 0; index < sizeA; index += 1) {
          indicesA[index] = Math.floor(random() * sizeA);
        }
        if (paired) {
          // Paired data resamples whole tasks, so each task keeps both of its times.
          indicesB.set(indicesA);
        } else {
          for (let index = 0; index < sizeB; index += 1) {
            indicesB[index] = Math.floor(random() * sizeB);
          }
        }

        const value = statistic(indicesA, indicesB);
        if (Number.isFinite(value)) {
          results[usable] = value;
          usable += 1;
        }
      }

      return done >= resamples;
    },
    finish: () => {
      const sorted = results.slice(0, usable).sort();

      return {
        seed,
        resamples,
        rows,
        sampledRows: sizeA + sizeB,
        usable,
        lower: quantileSorted(sorted, 0.025),
        upper: quantileSorted(sorted, 0.975),
      };
    },
  };
};

/**
 * Without an explicit resample count, the work budget picks the count and,
 * for a large file, a seeded subsample. An explicit count keeps every row.
 */
const budgeted = <T>(
  all: [readonly T[], readonly T[]],
  paired: boolean,
  seed: number,
  resamples: number | undefined,
): { a: readonly T[]; b: readonly T[]; resamples: number } => {
  const [a, b] = all;
  checkSizes(a.length, b.length, paired);
  if (resamples !== undefined) return { a, b, resamples };

  const plan = planBootstrap(a.length, b.length, paired);
  const [sampleA, sampleB] = subsample(a, b, plan, paired, seed);

  return { a: sampleA, b: sampleB, resamples: plan.resamples };
};

/**
 * A percentile interval for the difference in medians, A − B. Unpaired data
 * resamples each condition on its own; paired data, given as two arrays in
 * task order, resamples tasks. Throws a RangeError for an empty condition, or
 * for paired arrays of different lengths.
 */
export const medianDifferenceJob = (
  allA: readonly number[],
  allB: readonly number[],
  { seed, paired = false, resamples }: { seed: number; paired?: boolean; resamples?: number },
): BootstrapJob => {
  const { a, b, ...plan } = budgeted([allA, allB], paired, seed, resamples);
  const scratchA = new Float64Array(a.length);
  const scratchB = new Float64Array(b.length);
  const rows = allA.length + allB.length;

  return createJob(a.length, b.length, paired, seed, plan.resamples, rows, (indicesA, indicesB) => {
    for (let index = 0; index < indicesA.length; index += 1) scratchA[index] = a[indicesA[index]];
    for (let index = 0; index < indicesB.length; index += 1) scratchB[index] = b[indicesB[index]];

    return medianInPlace(scratchA, scratchA.length) - medianInPlace(scratchB, scratchB.length);
  });
};

export type CostRecord = { cost: number; accepted: boolean };

/**
 * A percentile interval for the difference in cost per accepted result, A − B,
 * or `'too-many-rows'` when the work budget would need a subsample. A
 * subsample can leave out every accepted task in a condition, such as the one
 * accepted task among 50,000, which would make the interval depend on the seed.
 */
export const costPerAcceptedJob = (
  allA: readonly CostRecord[],
  allB: readonly CostRecord[],
  { seed, resamples }: { seed: number; resamples?: number },
): BootstrapJob | 'too-many-rows' => {
  checkSizes(allA.length, allB.length, false);
  if (resamples === undefined) {
    const plan = planBootstrap(allA.length, allB.length);
    if (plan.sampleA < allA.length || plan.sampleB < allB.length) return 'too-many-rows';
  }

  const { a, b, ...plan } = budgeted([allA, allB], false, seed, resamples);

  const ratio = (records: readonly CostRecord[], indices: Int32Array): number => {
    let cost = 0;
    let accepted = 0;
    for (let index = 0; index < indices.length; index += 1) {
      const record = records[indices[index]];
      cost += record.cost;
      if (record.accepted) accepted += 1;
    }

    return accepted === 0 ? Number.NaN : cost / accepted;
  };

  return createJob(
    a.length,
    b.length,
    false,
    seed,
    plan.resamples,
    allA.length + allB.length,
    (indicesA, indicesB) => ratio(a, indicesA) - ratio(b, indicesB),
  );
};

/** Runs a job to the end in one go, for tests and small data. */
export const runToEnd = (job: BootstrapJob): BootstrapInterval => {
  job.advance(job.total);

  return job.finish();
};

/**
 * Runs a job in slices of about `sliceMilliseconds`, yielding to the browser
 * between them and reporting progress. Resolves to null if `cancelled` turns
 * true, such as when the data changes mid-run.
 */
export const runInSlices = async (
  job: BootstrapJob,
  {
    onProgress,
    cancelled,
    sliceMilliseconds = 30,
  }: {
    onProgress?: (completed: number, total: number) => void;
    cancelled?: () => boolean;
    sliceMilliseconds?: number;
  } = {},
): Promise<BootstrapInterval | null> => {
  let batch = 50;

  for (;;) {
    if (cancelled?.()) return null;

    const started = performance.now();
    const finished = job.advance(batch);
    const elapsed = performance.now() - started;
    onProgress?.(job.completed(), job.total);
    if (finished) return job.finish();

    // Size the next slice from how long this one took.
    batch = Math.max(1, Math.round(batch * (sliceMilliseconds / Math.max(1, elapsed))));
    batch = Math.min(batch, 5_000);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};
