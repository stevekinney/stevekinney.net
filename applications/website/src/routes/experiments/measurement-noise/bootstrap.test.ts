import { describe, expect, it } from 'vitest';

import {
  costPerAcceptedJob,
  createRandom,
  medianInPlace,
  medianDifferenceJob,
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
    const result = runToEnd(costPerAcceptedJob(groupA, groupB, { seed: 5, resamples: 2_000 }));

    // A's resamples cost $2 for one accepted, or $2 for two; a resample with none is skipped.
    expect(result.usable).toBeLessThan(2_000);
    expect(result.usable).toBeGreaterThan(1_000);
    expect(result.lower).toBe(-1);
    expect(result.upper).toBe(0);
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
