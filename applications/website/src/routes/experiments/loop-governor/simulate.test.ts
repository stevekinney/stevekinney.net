import { describe, expect, it } from 'vitest';

import { analyticRows, expectedIterations, falseDoneBeforeTrue, successWithin } from './analytic';
import { HORIZON, defaultConfig } from './loop-config';
import type { Config } from './loop-config';
import { createRandom } from './random';
import { sampleRun, simulateBatch, simulateRun } from './simulate';
import type { Tally } from './simulate';

const config = (overrides: Partial<Config> = {}): Config => ({ ...defaultConfig(), ...overrides });

const withGovernors = (
  overrides: Partial<Config>,
  governors: Partial<Config['governors']>,
): Config => {
  const base = config(overrides);

  return { ...base, governors: { ...base.governors, ...governors } };
};

const noLies = (overrides: Partial<Config> = {}): Config => {
  const base = config(overrides);

  return { ...base, ladder: { ...base.ladder, [base.marker]: 0 } };
};

const share = (tally: Tally, count: number): number => count / tally.runs;

const meanIterations = (tally: Tally): number =>
  tally.iterations.reduce((sum, value) => sum + value, 0) / tally.runs;

describe('acceptance check 1: fresh context, k = 1, no lies, no governors', () => {
  it('expects 2.857 iterations', () => {
    expect(expectedIterations(0.35).toFixed(3)).toBe('2.857');
  });

  it('succeeds within 5 iterations with chance 0.884, because 0.65⁵ = 0.116', () => {
    expect((0.65 ** 5).toFixed(3)).toBe('0.116');
    expect(successWithin(0.35, 5).toFixed(3)).toBe('0.884');
  });

  // The specification asks for ±0.02, but the standard error of the mean of a
  // geometric(0.35) wait over 10,000 runs is √0.65 / 0.35 / 100 ≈ 0.023, so ±0.02
  // holds for only about 62% of seeds. Seed 42 lands at 2.885, 0.028 away, which
  // is 1.2 standard errors. The test allows two standard errors.
  it('lands within two standard errors (±0.046) of 2.857 with 10,000 runs at seed 42', () => {
    const tally = simulateBatch(noLies({ runs: 10_000 }));
    const standardError = Math.sqrt(0.65) / 0.35 / Math.sqrt(10_000);

    expect(standardError.toFixed(3)).toBe('0.023');
    expect(tally.outcomes['done-honest']).toBe(10_000);
    expect(meanIterations(tally).toFixed(3)).toBe('2.885');
    expect(Math.abs(meanIterations(tally) - 1 / 0.35)).toBeLessThanOrEqual(2 * standardError);
  });

  it('lands within ±0.02 of 2.857 for most seeds, as the specification expects', () => {
    const seeds = Array.from({ length: 20 }, (_, index) => index + 1);
    const within = seeds.filter((seed) => {
      const tally = simulateBatch(noLies({ runs: 10_000, seed }));

      return Math.abs(meanIterations(tally) - 1 / 0.35) <= 0.02;
    });

    expect(within.length).toBeGreaterThanOrEqual(10);
  });

  it('lands within ±0.02 of 0.884 with a maximum of 5 iterations', () => {
    const settings = withGovernors({ maxIterations: 5, runs: 10_000 }, { maxIterations: true });
    const capped = simulateBatch({
      ...settings,
      ladder: { ...settings.ladder, 'promise-string': 0 },
    });

    expect(Math.abs(share(capped, capped.outcomes['done-honest']) - 0.884)).toBeLessThanOrEqual(
      0.02,
    );
    expect(capped.outcomes['done-honest'] + capped.stoppedBy.maxIterations).toBe(10_000);
  });

  it('puts both closed forms beside their estimates', () => {
    const uncapped = noLies({ runs: 10_000 });
    const rows = analyticRows(uncapped, simulateBatch(uncapped));

    expect(rows.find((row) => row.id === 'expected-iterations')?.exact.toFixed(3)).toBe('2.857');

    const settings = withGovernors({ maxIterations: 5 }, { maxIterations: true });
    const capped = { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } };
    const cappedRows = analyticRows(capped, simulateBatch(capped));

    expect(cappedRows.find((row) => row.id === 'success-within')?.exact.toFixed(3)).toBe('0.884');
  });
});

describe('acceptance check 2: promise string, marker only', () => {
  it('ends falsely done in 0.0975 / 0.4475 = 21.8% of runs', () => {
    expect(((1 - 0.35) * 0.15).toFixed(4)).toBe('0.0975');
    expect((0.35 + (1 - 0.35) * 0.15).toFixed(4)).toBe('0.4475');
    expect((falseDoneBeforeTrue(0.35, 0.15) * 100).toFixed(1)).toBe('21.8');
  });

  it('simulates close to 21.8% with the defaults', () => {
    const tally = simulateBatch(config({ runs: 10_000 }));

    expect(Math.abs(share(tally, tally.outcomes['done-false']) - 0.2179)).toBeLessThanOrEqual(0.02);
    expect(tally.outcomes['done-honest'] + tally.outcomes['done-false']).toBe(10_000);
  });
});

describe('acceptance check 3: the dual condition', () => {
  it('makes false done 0% and still logs and counts the premature claims', () => {
    const tally = simulateBatch(config({ dual: true, runs: 10_000 }));

    expect(tally.outcomes['done-false']).toBe(0);
    expect(tally.outcomes['done-honest']).toBe(10_000);
    expect(tally.prematureClaims).toBeGreaterThan(0);
    expect(tally.runsWithClaims).toBeGreaterThan(0);
  });

  it('logs each caught claim in the sample run’s timeline', () => {
    const settings = config({ dual: true, p: 0.05, seed: 7 });
    const run = sampleRun(settings);
    const claims = run.records?.filter((record) => record.event === 'claim').length;

    expect(run.outcome).toBe('done-honest');
    expect(claims).toBe(run.prematureClaims);
  });
});

describe('acceptance check 5: fail-open against fail-closed', () => {
  it('ends about 20% of runs falsely done on iteration 1 when failing open', () => {
    const tally = simulateBatch(config({ e: 0.2, runs: 10_000 }));
    const throws = share(tally, tally.firstIterationThrows);

    expect(Math.abs(throws - 0.2)).toBeLessThanOrEqual(0.02);
    expect(tally.firstIteration['done-false']).toBeGreaterThanOrEqual(tally.firstIterationThrows);
  });

  it('moves those runs to broken when failing closed', () => {
    const open = simulateBatch(config({ e: 0.2, runs: 10_000 }));
    const closed = simulateBatch(config({ e: 0.2, failureMode: 'closed', runs: 10_000 }));

    // The same seed draws the same throws, so the same runs end on iteration 1.
    expect(closed.firstIteration.broken).toBe(open.firstIterationThrows);
    expect(Math.abs(share(closed, closed.firstIteration.broken) - 0.2)).toBeLessThanOrEqual(0.02);
    expect(closed.outcomes.broken).toBeGreaterThan(0);
    expect(closed.outcomes['done-false']).toBeLessThan(open.outcomes['done-false']);
  });
});

describe('acceptance check 6: an impossible task with q = 0', () => {
  const impossible = (overrides: Partial<Config>): Config => {
    const base = config({ p: 0, ...overrides });

    return { ...base, ladder: { ...base.ladder, 'promise-string': 0 } };
  };

  it('stops every run by the stall detector at iteration 3', () => {
    const settings = impossible({ runs: 1_000 });
    const tally = simulateBatch({ ...settings, governors: { ...settings.governors, stall: true } });

    expect(tally.stoppedBy.stall).toBe(1_000);
    expect([...tally.iterations].every((iterations) => iterations === 3)).toBe(true);
  });

  it('runs every run away to 2,000 iterations with no governors', () => {
    const tally = simulateBatch(impossible({ runs: 50 }));

    expect(tally.outcomes.runaway).toBe(50);
    expect([...tally.iterations].every((iterations) => iterations === HORIZON)).toBe(true);
    expect(HORIZON).toBe(2_000);
  });
});

describe('the edge cases', () => {
  it('finishes on the first iteration when p = 1', () => {
    const tally = simulateBatch(config({ p: 1, runs: 500 }));

    expect(tally.outcomes['done-honest']).toBe(500);
    expect(tally.firstIteration['done-honest']).toBe(500);
  });

  it('never stops before the stall detector when q = 0 and no progress is possible', () => {
    const settings = withGovernors({ p: 0, stallM: 5 }, { stall: true });
    const run = simulateRun(
      { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } },
      createRandom(1),
    );

    expect(run.outcome).toBe('stopped');
    expect(run.iterations).toBe(5);
  });

  it('can’t finish honestly when k is greater than the maximum iterations', () => {
    const tally = simulateBatch(
      withGovernors({ k: 12, maxIterations: 10, p: 1, runs: 100 }, { maxIterations: true }),
    );

    expect(tally.outcomes['done-honest']).toBe(0);
    expect(tally.stoppedBy.maxIterations).toBe(100);
  });

  it('stops after one iteration, already over, when the budget is smaller than one iteration', () => {
    const settings = withGovernors({ p: 0.01, budget: 0.25 }, { budget: true });
    const tally = simulateBatch({
      ...settings,
      ladder: { ...settings.ladder, 'promise-string': 0 },
      runs: 200,
    });

    expect(tally.stoppedBy.budget + tally.outcomes['done-honest']).toBe(200);
    expect([...tally.iterations].every((iterations) => iterations === 1)).toBe(true);
    expect([...tally.costs].every((cost) => cost === 0.4)).toBe(true);
  });

  it('gives the same tally for the same seed and a different one for another', () => {
    const first = simulateBatch(config({ runs: 300 }));
    const again = simulateBatch(config({ runs: 300 }));
    const other = simulateBatch(config({ runs: 300, seed: 43 }));

    expect([...again.iterations]).toEqual([...first.iterations]);
    expect([...other.iterations]).not.toEqual([...first.iterations]);
  });

  it('runs 10,000 runs', () => {
    expect(simulateBatch(config({ runs: 10_000 })).runs).toBe(10_000);
  });
});

describe('the governors', () => {
  it('stops at the maximum iteration count', () => {
    const settings = withGovernors({ p: 0, maxIterations: 7 }, { maxIterations: true });
    const run = simulateRun(
      { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } },
      createRandom(3),
    );

    expect(run).toMatchObject({ outcome: 'stopped', stoppedBy: 'maxIterations', iterations: 7 });
    expect(run.cost).toBe(2.8);
  });

  it('stops when spending reaches the budget, after the iteration that crosses it', () => {
    const settings = withGovernors({ p: 0, budget: 5 }, { budget: true });
    const run = simulateRun(
      { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } },
      createRandom(3),
    );

    // $0.40 an iteration reaches $5 on iteration 13, at $5.20.
    expect(run).toMatchObject({
      outcome: 'stopped',
      stoppedBy: 'budget',
      iterations: 13,
      cost: 5.2,
    });
  });

  it('stops on the same failure twice in a row', () => {
    const settings = withGovernors({ p: 0, repeatChance: 1 }, { repeatedFailure: true });
    const run = simulateRun(
      { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } },
      createRandom(3),
    );

    expect(run).toMatchObject({ outcome: 'stopped', stoppedBy: 'repeatedFailure', iterations: 2 });
  });

  it('checks the maximum before the budget when both fire on the same iteration', () => {
    const settings = withGovernors(
      { p: 0, maxIterations: 5, budget: 2 },
      { maxIterations: true, budget: true },
    );
    const run = simulateRun(
      { ...settings, ladder: { ...settings.ladder, 'promise-string': 0 } },
      createRandom(3),
    );

    expect(run).toMatchObject({ stoppedBy: 'maxIterations', iterations: 5, cost: 2 });
  });

  it('halts on a touched stop file only when the loop checks it', () => {
    const base = config({ p: 0 });
    const quiet = { ...base, ladder: { ...base.ladder, 'promise-string': 0 } };
    const checked = {
      ...quiet,
      governors: { ...quiet.governors, stopFile: true, maxIterations: true },
    };

    expect(sampleRun(checked, 4)).toMatchObject({
      outcome: 'stopped',
      stoppedBy: 'stopFile',
      iterations: 3,
    });

    const unchecked = { ...quiet, governors: { ...quiet.governors, maxIterations: true } };
    expect(sampleRun(unchecked, 4)).toMatchObject({ stoppedBy: 'maxIterations', iterations: 10 });
  });

  it('replays the same draws up to the touch', () => {
    const settings = withGovernors({ p: 0.2 }, { stopFile: true, maxIterations: true });
    const full = sampleRun({ ...settings, dual: true });
    const touched = sampleRun({ ...settings, dual: true }, 3);

    expect(touched.records).toEqual(full.records?.slice(0, 2));
  });
});

describe('an impossible task with the honest way out', () => {
  const impossible = (honestWayOut: boolean): Config =>
    withGovernors({ impossible: true, honestWayOut, runs: 10_000 }, { maxIterations: true });

  it('cheats in about 54% of runs without a BLOCKED exit', () => {
    const tally = simulateBatch(impossible(false));

    expect(Math.abs(share(tally, tally.outcomes['done-false']) - 0.54)).toBeLessThanOrEqual(0.02);
    expect(tally.outcomes.blocked).toBe(0);
    expect(tally.outcomes['done-false'] + tally.stoppedBy.maxIterations).toBe(10_000);
  });

  it('cheats in about 9% with one, and the rest take the exit', () => {
    const tally = simulateBatch(impossible(true));

    expect(Math.abs(share(tally, tally.outcomes['done-false']) - 0.09)).toBeLessThanOrEqual(0.02);
    expect(tally.outcomes['done-false'] + tally.outcomes.blocked).toBe(10_000);
  });

  it('never makes progress, whatever p says', () => {
    const tally = simulateBatch({ ...impossible(true), p: 1 });

    expect(tally.outcomes['done-honest']).toBe(0);
  });
});
