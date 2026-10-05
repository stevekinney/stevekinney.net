import { describe, expect, it } from 'vitest';

import { drawAgents, drawMinutes, drawOutcome, durationGrid } from './agents';
import { defaultConfig } from './config';
import { logNormal, uniform } from './random';
import { simulate } from './schedule';

const outcomeOptions = {
  seed: 7,
  failureProbability: 0,
  validationFailureProbability: 0,
  validationAttempts: 5,
};

describe('acceptance check 6: schema validation', () => {
  it('ends in an error, not a null, when every one of 5 attempts fails validation', () => {
    const draw = drawOutcome(0, 0, { ...outcomeOptions, validationFailureProbability: 1 });

    expect(draw).toEqual({ outcome: 'error', attempts: 5 });
  });

  it('errors every agent at a probability of 1, and the runtime logs each one', () => {
    const config = { ...defaultConfig(), items: 3, validationFailureProbability: 1 };
    const grid = drawAgents(config);
    const schedule = simulate(grid, {
      strategy: 'pipeline',
      concurrency: 16,
      errorHandling: 'caught',
      validationAttempts: 5,
    });

    expect(grid.every((row) => row[0].outcome === 'error')).toBe(true);
    expect(schedule.logged).toHaveLength(3);
    expect(schedule.results?.every((result) => result.reason === 'error')).toBe(true);
  });

  it('respects a different number of attempts', () => {
    expect(
      drawOutcome(0, 0, {
        ...outcomeOptions,
        validationFailureProbability: 1,
        validationAttempts: 2,
      }),
    ).toEqual({ outcome: 'error', attempts: 2 });
  });

  it('succeeds on the first attempt when validation never fails', () => {
    expect(drawOutcome(0, 0, outcomeOptions)).toEqual({ outcome: 'value', attempts: 1 });
  });
});

describe('drawOutcome', () => {
  it('returns null for every agent at a failure probability of 1', () => {
    expect(drawOutcome(3, 1, { ...outcomeOptions, failureProbability: 1 })).toEqual({
      outcome: 'null',
      attempts: 0,
    });
  });
});

describe('the seeded generator', () => {
  it('gives the same draws for the same seed and different ones for another', () => {
    expect(uniform(7, 2, 1, 'duration')).toBe(uniform(7, 2, 1, 'duration'));
    expect(uniform(7, 2, 1, 'duration')).not.toBe(uniform(8, 2, 1, 'duration'));
    expect(uniform(7, 2, 1, 'duration')).not.toBe(uniform(7, 2, 1, 'failure'));
  });

  it('stays in [0, 1)', () => {
    for (let item = 0; item < 500; item += 1) {
      const value = uniform(7, item, 0, 'duration');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('has a log-normal mean close to the one asked for', () => {
    let sum = 0;
    const draws = 20_000;
    for (let item = 0; item < draws; item += 1) {
      sum += logNormal(
        4,
        0.5,
        uniform(1, item, 0, 'duration', 0),
        uniform(1, item, 0, 'duration', 1),
      );
    }

    expect(sum / draws).toBeGreaterThan(3.85);
    expect(sum / draws).toBeLessThan(4.15);
  });

  it('returns the mean when there is no variability', () => {
    expect(drawMinutes(0, 0, 7, 3, 0)).toBe(3);
  });

  it('keeps durations when the failure rate changes or items are added', () => {
    const config = defaultConfig();
    const before = durationGrid(config);

    expect(durationGrid({ ...config, failureProbability: 0.5 })).toEqual(before);
    expect(durationGrid({ ...config, items: 12 }).slice(0, 8)).toEqual(before);
  });

  it('rounds every generated duration to a tenth of a minute, at least 0.1', () => {
    for (const row of durationGrid({ ...defaultConfig(), items: 200 })) {
      for (const minutes of row) {
        expect(minutes).toBeGreaterThanOrEqual(0.1);
        expect(Math.round(minutes * 10)).toBeCloseTo(minutes * 10, 9);
      }
    }
  });
});

describe('durationGrid', () => {
  it('uses the manual grid in manual mode', () => {
    const config = {
      ...defaultConfig(),
      items: 2,
      durationMode: 'manual' as const,
      manual: [
        [1, 2],
        [3, 4.25],
      ],
    };

    expect(durationGrid(config)).toEqual([
      [1, 2],
      [3, 4.3],
    ]);
  });
});
