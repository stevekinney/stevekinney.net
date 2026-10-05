import { iterationCost, roundDollars } from './cost';
import { HORIZON, claimChance, governorIds, progressChance } from './loop-config';
import type { Config, GovernorId } from './loop-config';
import { createRandom } from './random';
import type { Random } from './random';

export type OutcomeId = 'done-honest' | 'done-false' | 'stopped' | 'broken' | 'blocked' | 'runaway';

export const outcomeIds: readonly OutcomeId[] = [
  'done-honest',
  'done-false',
  'stopped',
  'broken',
  'blocked',
  'runaway',
];

export type StopReason = GovernorId | 'stopFile';

/** What one iteration did, for the animated timeline. */
export type IterationEvent =
  'progress' | 'no-progress' | 'claim' | 'false-claim' | 'throw' | 'done' | 'blocked';

export type IterationRecord = {
  iteration: number;
  event: IterationEvent;
  /** Total spent after this iteration. */
  cumulative: number;
  /** The governor that fired after this iteration, if one did. */
  governor: StopReason | null;
};

export type RunResult = {
  outcome: OutcomeId;
  /** The governor that stopped the run, when the outcome is `stopped`. */
  stoppedBy: StopReason | null;
  /** The iteration the run ended on. A stop file touched before iteration 1 ends at 0. */
  iterations: number;
  cost: number;
  /** Whether the run ended because the measurement threw. */
  threw: boolean;
  /** Claims of done that the deterministic check rejected. */
  prematureClaims: number;
  /** Only when asked for, because 10,000 runs of 2,000 iterations would be 20 million records. */
  records: IterationRecord[] | null;
};

export type RunOptions = {
  /** Keep a record of every iteration. */
  record?: boolean;
  /**
   * The iteration before which a person touched the stop file. It only halts the
   * run if the stop file governor is on.
   */
  stopTouchedBefore?: number | null;
};

/**
 * Runs one loop, iteration by iteration, in the specification's order:
 *
 * 1. Kill switch: a touched stop file halts before the iteration starts.
 * 2. Measurement: throws with chance `e`. Failing open reads zero remaining and
 *    ends falsely done; failing closed ends broken. The agent never runs, so the
 *    iteration costs nothing.
 * 3. Work: real progress with chance `p`. The `k`th progress ends the run done.
 * 4. Premature claim: with chance `q`, or once per run on an impossible task.
 *    Trusting the marker ends falsely done; a dual condition logs it and goes on.
 * 5. Cost, charged for every iteration the agent ran.
 * 6. Governors, in order, and the horizon.
 */
export const simulateRun = (
  config: Config,
  random: Random,
  { record = false, stopTouchedBefore = null }: RunOptions = {},
): RunResult => {
  const p = progressChance(config);
  const q = claimChance(config);
  const records: IterationRecord[] | null = record ? [] : null;

  // On an impossible task, whether the agent cheats is drawn once per run.
  const cheats = config.impossible
    ? random() < (config.honestWayOut ? config.cheatWith : config.cheatWithout)
    : false;

  let progress = 0;
  let cost = 0;
  let sinceProgress = 0;
  let prematureClaims = 0;
  let previousFailed = false;

  const finish = (
    outcome: OutcomeId,
    iterations: number,
    stoppedBy: StopReason | null = null,
  ): RunResult => ({
    outcome,
    stoppedBy,
    iterations,
    threw: false,
    cost: roundDollars(cost),
    prematureClaims,
    records,
  });

  const note = (iteration: number, event: IterationEvent, governor: StopReason | null = null) => {
    records?.push({ iteration, event, cumulative: roundDollars(cost), governor });
  };

  for (let iteration = 1; ; iteration += 1) {
    // 1. The kill switch is checked before anything else in the iteration.
    if (config.governors.stopFile && stopTouchedBefore !== null && iteration >= stopTouchedBefore) {
      return finish('stopped', iteration - 1, 'stopFile');
    }

    // 2. Measurement.
    if (config.e > 0 && random() < config.e) {
      note(iteration, 'throw');

      return {
        ...finish(config.failureMode === 'open' ? 'done-false' : 'broken', iteration),
        threw: true,
      };
    }

    // 3. Work. The agent ran, so the iteration costs money whatever happens next.
    cost += iterationCost(config, iteration - 1);
    const progressed = p > 0 && random() < p;
    let claimed = false;

    if (progressed) {
      progress += 1;
      sinceProgress = 0;
      previousFailed = false;

      if (progress >= config.k) {
        note(iteration, 'done');

        return finish('done-honest', iteration);
      }
    } else {
      sinceProgress += 1;

      // 4. The work isn't complete. Does the agent claim it is?
      let claims = false;
      if (config.impossible) {
        if (cheats) claims = true;
        else if (config.honestWayOut) {
          note(iteration, 'blocked');

          return finish('blocked', iteration);
        }
      } else {
        claims = q > 0 && random() < q;
      }

      if (claims && !config.dual) {
        note(iteration, 'false-claim');

        return finish('done-false', iteration);
      }
      if (claims) {
        prematureClaims += 1;
        claimed = true;
      }
    }

    // A failure repeats the one before it with chance `repeatChance`, if the one before failed too.
    const sameFailure =
      !progressed && previousFailed && config.repeatChance > 0 && random() < config.repeatChance;
    if (!progressed) previousFailed = true;

    // 6. Governors, checked after the iteration, first one wins.
    const spent = roundDollars(cost);
    const fired = governorIds.find((id) => {
      if (!config.governors[id]) return false;
      if (id === 'maxIterations') return iteration >= config.maxIterations;
      if (id === 'budget') return spent >= config.budget;
      if (id === 'stall') return sinceProgress >= config.stallM;

      return sameFailure;
    });

    const event: IterationEvent = progressed ? 'progress' : claimed ? 'claim' : 'no-progress';
    note(iteration, event, fired ?? null);

    if (fired) return finish('stopped', iteration, fired);
    if (iteration >= HORIZON) return finish('runaway', iteration);
  }
};

/** Everything the page shows about a batch of runs. */
export type Tally = {
  runs: number;
  outcomes: Record<OutcomeId, number>;
  stoppedBy: Record<StopReason, number>;
  /** Runs that ended on their first iteration, by outcome. */
  firstIteration: Record<OutcomeId, number>;
  /** Runs that ended on iteration 1 because the measurement threw. */
  firstIterationThrows: number;
  /** Premature claims a dual condition caught, across every run. */
  prematureClaims: number;
  /** Runs with at least one caught premature claim. */
  runsWithClaims: number;
  /** One per run, in run order. */
  costs: Float64Array;
  iterations: Uint16Array;
  /** Outcome index into `outcomeIds`, one per run. */
  outcomeOf: Uint8Array;
};

const zeroOutcomes = (): Record<OutcomeId, number> => ({
  'done-honest': 0,
  'done-false': 0,
  stopped: 0,
  broken: 0,
  blocked: 0,
  runaway: 0,
});

export const createTally = (runs: number): Tally => ({
  runs: 0,
  outcomes: zeroOutcomes(),
  stoppedBy: { maxIterations: 0, budget: 0, stall: 0, repeatedFailure: 0, stopFile: 0 },
  firstIteration: zeroOutcomes(),
  firstIterationThrows: 0,
  prematureClaims: 0,
  runsWithClaims: 0,
  costs: new Float64Array(runs),
  iterations: new Uint16Array(runs),
  outcomeOf: new Uint8Array(runs),
});

export const addRun = (tally: Tally, result: RunResult): void => {
  const index = tally.runs;

  tally.outcomes[result.outcome] += 1;
  if (result.stoppedBy) tally.stoppedBy[result.stoppedBy] += 1;
  if (result.iterations === 1) tally.firstIteration[result.outcome] += 1;
  if (result.iterations === 1 && result.threw) tally.firstIterationThrows += 1;
  tally.prematureClaims += result.prematureClaims;
  if (result.prematureClaims > 0) tally.runsWithClaims += 1;
  tally.costs[index] = result.cost;
  tally.iterations[index] = result.iterations;
  tally.outcomeOf[index] = outcomeIds.indexOf(result.outcome);
  tally.runs += 1;
};

/**
 * A batch that runs in slices, so 10,000 runs of up to 2,000 iterations never
 * freeze the page. Every run draws from one generator seeded once, so the
 * result is the same however the work is sliced.
 */
export type Batch = {
  tally: Tally;
  /** Runs until the batch is done or `milliseconds` have passed. Returns whether it's done. */
  step: (milliseconds: number) => boolean;
};

export const createBatch = (config: Config): Batch => {
  const random = createRandom(config.seed);
  const tally = createTally(config.runs);

  return {
    tally,
    step: (milliseconds) => {
      const started = performance.now();

      while (tally.runs < config.runs) {
        addRun(tally, simulateRun(config, random));
        // Checking the clock every run is cheap next to a run itself.
        if (performance.now() - started >= milliseconds) break;
      }

      return tally.runs >= config.runs;
    },
  };
};

/** Every run at once. For tests and small batches. */
export const simulateBatch = (config: Config): Tally => {
  const batch = createBatch(config);
  batch.step(Number.POSITIVE_INFINITY);

  return batch.tally;
};

/**
 * The run the timeline animates: the batch's first run, recorded iteration by
 * iteration. A touched stop file replays the same draws up to the touch.
 */
export const sampleRun = (config: Config, stopTouchedBefore: number | null = null): RunResult =>
  simulateRun(config, createRandom(config.seed), { record: true, stopTouchedBefore });
