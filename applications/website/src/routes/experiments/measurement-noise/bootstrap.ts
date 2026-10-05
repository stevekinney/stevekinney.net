/**
 * A percentile bootstrap. All randomness on the page comes from the seeded
 * generator here, so the same seed and data always give the same interval.
 */

export const BOOTSTRAP_RESAMPLES = 10_000;
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

type Statistic = (indicesA: Int32Array, indicesB: Int32Array) => number;

const createJob = (
  sizeA: number,
  sizeB: number,
  paired: boolean,
  seed: number,
  resamples: number,
  statistic: Statistic,
): BootstrapJob => {
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
        usable,
        lower: quantileSorted(sorted, 0.025),
        upper: quantileSorted(sorted, 0.975),
      };
    },
  };
};

/**
 * A percentile interval for the difference in medians, A − B. Unpaired data
 * resamples each condition on its own; paired data, given as two arrays in
 * task order, resamples tasks.
 */
export const medianDifferenceJob = (
  a: readonly number[],
  b: readonly number[],
  {
    seed,
    paired = false,
    resamples = BOOTSTRAP_RESAMPLES,
  }: { seed: number; paired?: boolean; resamples?: number },
): BootstrapJob => {
  const scratchA = new Float64Array(a.length);
  const scratchB = new Float64Array(b.length);

  return createJob(a.length, b.length, paired, seed, resamples, (indicesA, indicesB) => {
    for (let index = 0; index < indicesA.length; index += 1) scratchA[index] = a[indicesA[index]];
    for (let index = 0; index < indicesB.length; index += 1) scratchB[index] = b[indicesB[index]];

    return medianInPlace(scratchA, scratchA.length) - medianInPlace(scratchB, scratchB.length);
  });
};

export type CostRecord = { cost: number; accepted: boolean };

/** A percentile interval for the difference in cost per accepted result, A − B. */
export const costPerAcceptedJob = (
  a: readonly CostRecord[],
  b: readonly CostRecord[],
  { seed, resamples = BOOTSTRAP_RESAMPLES }: { seed: number; resamples?: number },
): BootstrapJob => {
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
    resamples,
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
