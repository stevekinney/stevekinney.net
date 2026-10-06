import { describe, expect, it } from 'vitest';

import {
  BOOTSTRAP_RESAMPLES,
  BOOTSTRAP_WORK_BUDGET,
  budgetNote,
  costPerAcceptedJob,
  createRandom,
  MIN_BOOTSTRAP_RESAMPLES,
  medianInPlace,
  medianDifferenceJob,
  planBootstrap,
  quantileSorted,
  runInSlices,
  runToEnd,
} from './bootstrap';
import { median } from './statistics';

const a = [40, 55, 30, 70, 45];
const b = [52, 30, 41, 38, 43];

describe('createRandom', () => {
  it('repeats exactly for the same seed and differs for another', () => {
    const first = createRandom(42);
    const second = createRandom(42);
    const other = createRandom(43);
    const run = (next: () => number) => Array.from({ length: 5 }, next);

    const values = run(first);
    expect(run(second)).toEqual(values);
    expect(run(other)).not.toEqual(values);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('acceptance 5: the bootstrap', () => {
  it('gives the same interval for the same seed', () => {
    const first = runToEnd(medianDifferenceJob(a, b, { seed: 7 }));
    const second = runToEnd(medianDifferenceJob(a, b, { seed: 7 }));

    expect(second).toEqual(first);
    expect(first.resamples).toBe(10_000);
    expect(first.seed).toBe(7);
  });

  it('gives a slightly different interval for a different seed', () => {
    // Larger samples, so the percentile edges land between data values and move with the seed.
    const random = createRandom(1);
    const big = (shift: number) => Array.from({ length: 60 }, () => 30 + shift + random() * 40);
    const groupA = big(5);
    const groupB = big(0);

    const first = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 1 }));
    const second = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 2 }));

    expect([second.lower, second.upper]).not.toEqual([first.lower, first.upper]);
    expect(Math.abs(second.lower - first.lower)).toBeLessThan(2);
    expect(Math.abs(second.upper - first.upper)).toBeLessThan(2);
  });

  it('brackets the observed difference in medians', () => {
    const result = runToEnd(medianDifferenceJob(a, b, { seed: 11 }));
    const observed = median(a) - median(b);

    expect(result.lower).toBeLessThanOrEqual(observed);
    expect(result.upper).toBeGreaterThanOrEqual(observed);
  });

  it('resamples whole tasks when paired, so a constant gap gives a single-point interval', () => {
    const result = runToEnd(
      medianDifferenceJob([10, 20, 30, 40], [7, 17, 27, 37], { seed: 3, paired: true }),
    );

    expect(result.lower).toBe(3);
    expect(result.upper).toBe(3);
  });

  it('finds medians correctly in odd and even resamples', () => {
    // With one value per group, every resample is that value.
    expect(runToEnd(medianDifferenceJob([9], [4], { seed: 1, resamples: 50 }))).toMatchObject({
      lower: 5,
      upper: 5,
    });
    // Two identical values: an even-length median that must still be the value.
    expect(runToEnd(medianDifferenceJob([6, 6], [2, 2], { seed: 1, resamples: 50 }))).toMatchObject(
      {
        lower: 4,
        upper: 4,
      },
    );
  });

  it('runs in slices with progress, and stops when cancelled', async () => {
    const progress: number[] = [];
    const result = await runInSlices(medianDifferenceJob(a, b, { seed: 7 }), {
      onProgress: (completed) => progress.push(completed),
    });

    expect(result).toEqual(runToEnd(medianDifferenceJob(a, b, { seed: 7 })));
    expect(progress.at(-1)).toBe(10_000);
    expect(progress.length).toBeGreaterThan(1);

    expect(
      await runInSlices(medianDifferenceJob(a, b, { seed: 7 }), { cancelled: () => true }),
    ).toBeNull();
  });

  it('bootstraps the cost per accepted result, skipping resamples with nothing accepted', () => {
    const groupA = [
      { cost: 1, accepted: true },
      { cost: 1, accepted: false },
    ];
    const groupB = [
      { cost: 2, accepted: true },
      { cost: 2, accepted: true },
    ];
    const job = costPerAcceptedJob(groupA, groupB, { seed: 5, resamples: 2_000 });
    if (job === 'too-many-rows') throw new Error('Expected a job.');
    const result = runToEnd(job);

    // A's resamples cost $2 for one accepted, or $2 for two; a resample with none is skipped.
    expect(result.usable).toBeLessThan(2_000);
    expect(result.usable).toBeGreaterThan(1_000);
    expect(result.lower).toBe(-1);
    expect(result.upper).toBe(0);
  });
});

describe('the bootstrap work budget', () => {
  it('keeps 10,000 resamples while the work fits the budget', () => {
    expect(planBootstrap(500, 500)).toEqual({ resamples: 10_000, sampleA: 500, sampleB: 500 });
    expect(planBootstrap(1_000, 1_000)).toEqual({
      resamples: 10_000,
      sampleA: 1_000,
      sampleB: 1_000,
    });
  });

  it('reduces the resamples to fit, rounded down to a hundred', () => {
    expect(planBootstrap(5_000, 5_000)).toEqual({
      resamples: 2_000,
      sampleA: 5_000,
      sampleB: 5_000,
    });
    expect(planBootstrap(1_500, 1_000)).toEqual({
      resamples: 8_000,
      sampleA: 1_500,
      sampleB: 1_000,
    });
    expect(planBootstrap(1_001, 1_000).resamples).toBe(9_900);
  });

  it('never drops below 1,000 resamples, subsampling the rows instead', () => {
    expect(planBootstrap(50_000, 50_000)).toEqual({
      resamples: 1_000,
      sampleA: 10_000,
      sampleB: 10_000,
    });
    // A condition that fits in half the subsample stays whole; the other gets the rest.
    expect(planBootstrap(90_000, 10_000)).toEqual({
      resamples: 1_000,
      sampleA: 10_000,
      sampleB: 10_000,
    });
    expect(planBootstrap(100_000, 5)).toEqual({ resamples: 1_000, sampleA: 19_995, sampleB: 5 });
    expect(planBootstrap(1, 1_000_000)).toEqual({ resamples: 1_000, sampleA: 1, sampleB: 19_999 });
    // When both are larger than that, each keeps its share of the rows.
    expect(planBootstrap(60_000, 40_000)).toEqual({
      resamples: 1_000,
      sampleA: 12_000,
      sampleB: 8_000,
    });
  });

  it('subsamples paired data by task, the same tasks on both sides', () => {
    expect(planBootstrap(60_000, 60_000, true)).toEqual({
      resamples: 1_000,
      sampleA: 10_000,
      sampleB: 10_000,
    });
  });

  it('stays within the budget and above the minimum for any size', () => {
    for (const size of [2, 999, 1_000, 1_001, 9_999, 10_000, 10_001, 20_000, 33_333, 100_000]) {
      for (const paired of [false, true]) {
        const plan = planBootstrap(size, size, paired);

        expect(plan.sampleA).toBeGreaterThanOrEqual(1);
        expect(plan.sampleA).toBeLessThanOrEqual(size);
        expect(plan.sampleB).toBeGreaterThanOrEqual(1);
        expect(plan.sampleB).toBeLessThanOrEqual(size);

        expect((plan.sampleA + plan.sampleB) * plan.resamples).toBeLessThanOrEqual(
          BOOTSTRAP_WORK_BUDGET,
        );
        expect(plan.resamples).toBeGreaterThanOrEqual(MIN_BOOTSTRAP_RESAMPLES);
        expect(plan.resamples).toBeLessThanOrEqual(BOOTSTRAP_RESAMPLES);
      }
    }
  });

  it('keeps the same tasks on both sides when it subsamples paired data', () => {
    const random = createRandom(11);
    const groupA = Array.from({ length: 30_000 }, () => Math.floor(random() * 1_000));
    // Every task takes exactly 7 minutes longer under B, so only mismatched tasks could widen it.
    const groupB = groupA.map((value) => value + 7);

    const result = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 3, paired: true }));

    expect(result).toMatchObject({ resamples: 1_000, rows: 60_000, sampledRows: 20_000 });
    expect(result.lower).toBe(-7);
    expect(result.upper).toBe(-7);
  });

  it('bootstraps 100,000 rows on a seeded subsample, the same for the same seed', () => {
    const random = createRandom(9);
    const groupA = Array.from({ length: 50_000 }, () => 30 + random() * 40);
    const groupB = Array.from({ length: 50_000 }, () => 25 + random() * 40);

    const first = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 4 }));
    const second = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 4 }));
    const other = runToEnd(medianDifferenceJob(groupA, groupB, { seed: 5 }));

    expect(first).toEqual(second);
    expect(other).not.toEqual(first);
    expect(first).toMatchObject({ resamples: 1_000, rows: 100_000, sampledRows: 20_000 });
    expect(first.lower).toBeLessThan(5);
    expect(first.upper).toBeGreaterThan(5);
  });

  it('fewer resamples, but every row, for cost records under the budget', () => {
    const records = Array.from({ length: 5_000 }, (_, index) => ({
      cost: 1 + (index % 7),
      accepted: index % 3 !== 0,
    }));
    const job = costPerAcceptedJob(records, records, { seed: 2 });
    if (job === 'too-many-rows') throw new Error('Expected a job.');

    expect(runToEnd(job)).toMatchObject({ resamples: 2_000, rows: 10_000, sampledRows: 10_000 });
  });

  it('declines to bootstrap cost per accepted rather than subsample it', () => {
    // A subsample of 20,000 rows could leave out the only accepted task in A.
    const groupA = Array.from({ length: 50_000 }, (_, index) => ({
      cost: 1,
      accepted: index === 0,
    }));
    const groupB = Array.from({ length: 50_000 }, () => ({ cost: 2, accepted: true }));

    expect(costPerAcceptedJob(groupA, groupB, { seed: 2 })).toBe('too-many-rows');
    expect(costPerAcceptedJob(groupA, groupB, { seed: 3 })).toBe('too-many-rows');
  });

  it('keeps an explicit resample count and every row', () => {
    const result = runToEnd(medianDifferenceJob(a, b, { seed: 1, resamples: 50 }));

    expect(result).toMatchObject({ resamples: 50, rows: 10, sampledRows: 10 });
  });

  it('describes a reduced bootstrap, and says nothing about a full one', () => {
    const interval = { seed: 1, usable: 0, lower: 0, upper: 0 };

    expect(budgetNote({ ...interval, resamples: 10_000, rows: 400, sampledRows: 400 })).toBeNull();
    expect(budgetNote({ ...interval, resamples: 2_000, rows: 10_000, sampledRows: 10_000 })).toBe(
      'Bootstrapped with 2,000 resamples to stay responsive on 10,000 rows.',
    );
    expect(budgetNote({ ...interval, resamples: 1_000, rows: 100_000, sampledRows: 20_000 })).toBe(
      'Bootstrapped with 1,000 resamples on a seeded subsample of 20,000 rows to stay responsive on 100,000 rows.',
    );
  });
});

describe('bootstrap input guards', () => {
  it('rejects paired data of unequal lengths', () => {
    expect(() => medianDifferenceJob([1, 2, 3], [1, 2], { seed: 1, paired: true })).toThrow(
      RangeError,
    );
  });

  it('rejects an empty condition', () => {
    expect(() => medianDifferenceJob([], [1, 2], { seed: 1 })).toThrow(RangeError);
    expect(() => medianDifferenceJob([1, 2], [], { seed: 1 })).toThrow(RangeError);
    expect(() => costPerAcceptedJob([], [{ cost: 1, accepted: true }], { seed: 1 })).toThrow(
      RangeError,
    );
  });

  it('still accepts unpaired data of unequal lengths', () => {
    expect(() => medianDifferenceJob([1, 2, 3], [1, 2], { seed: 1 })).not.toThrow();
  });
});

describe('quantileSorted', () => {
  it('interpolates between neighbors', () => {
    expect(quantileSorted([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantileSorted([0, 10], 0.25)).toBe(2.5);
    expect(quantileSorted([], 0.5)).toBeNaN();
  });
});

describe('medianInPlace', () => {
  it('agrees with a sorted median on random data with ties, odd and even', () => {
    const random = createRandom(99);

    for (let trial = 0; trial < 500; trial += 1) {
      const length = 1 + Math.floor(random() * 40);
      const values = Array.from({ length }, () => Math.floor(random() * 10));

      expect(medianInPlace(Float64Array.from(values), length)).toBe(median(values));
    }
  });
});
