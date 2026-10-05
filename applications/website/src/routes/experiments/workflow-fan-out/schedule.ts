import type { AgentGrid } from './agents';
import type { ErrorHandling } from './config';

/**
 * `pipeline` sends each item through every stage on its own. `parallel` runs
 * one `parallel()` call per stage, so every item in a stage waits for the
 * slowest item of the stage before.
 */
export type Strategy = 'pipeline' | 'parallel';

/**
 * How an agent's slot ended. `skipped` never ran because its item already
 * resolved to `null`. `abandoned` was still running when an uncaught error
 * ended the run, and `not-started` was still waiting.
 */
export type AgentStatus = 'value' | 'null' | 'error' | 'skipped' | 'abandoned' | 'not-started';

export type ScheduledAgent = {
  item: number;
  stage: number;
  minutes: number;
  /** When its dependencies were met. Null if they never were. */
  ready: number | null;
  start: number | null;
  /** When it finished, or when the run ended for an abandoned agent. */
  end: number | null;
  status: AgentStatus;
  attempts: number;
};

/** What one item's slot in the results array holds. */
export type ItemResult = {
  item: number;
  value: 'value' | 'null';
  /** Why a slot is null: an agent that was stopped or failed, or a thrown error the runtime caught. */
  reason: 'value' | 'stopped' | 'error';
  /** The stage whose agent ended the item, or null for a value. */
  stage: number | null;
};

export type RunFailure = { item: number; stage: number; time: number };

export type Schedule = {
  strategy: Strategy;
  /** Item by item, then stage by stage. */
  agents: ScheduledAgent[];
  makespan: number;
  /** For `parallel`: when each stage after the first was released. Empty for `pipeline`. */
  barriers: number[];
  /** The uncaught error that ended the run, or null. */
  failure: RunFailure | null;
  /** What the script receives, or null when an uncaught error ended the run first. */
  results: ItemResult[] | null;
  /** Errors the runtime caught and logged, such as `pipeline[3] failed: …`. */
  logged: string[];
};

export type ScheduleOptions = {
  strategy: Strategy;
  concurrency: number;
  errorHandling: ErrorHandling;
  validationAttempts: number;
};

// The simulation counts in tenths of a minute, so `0.1 + 0.2` never drifts.
const TICKS_PER_MINUTE = 10;
const toTicks = (minutes: number): number => Math.round(minutes * TICKS_PER_MINUTE);
const toMinutes = (ticks: number): number => ticks / TICKS_PER_MINUTE;

type Slot = {
  item: number;
  stage: number;
  ticks: number;
  ready: number | null;
  start: number | null;
  end: number | null;
  status: AgentStatus | 'pending' | 'running';
};

const compareReady = (first: Slot, second: Slot): number =>
  (first.ready ?? 0) - (second.ready ?? 0) ||
  first.item - second.item ||
  first.stage - second.stage;

/**
 * A deterministic discrete-event simulation of the fan-out. Agents become
 * ready when their dependencies are met: the item's previous stage for
 * `pipeline`, all of the previous stage for `parallel`. Ready agents start in
 * order of ready time, then item, then stage, with at most `concurrency`
 * running at once.
 */
export const simulate = (grid: AgentGrid, options: ScheduleOptions): Schedule => {
  const { strategy, errorHandling } = options;
  const concurrency = Math.max(1, Math.floor(options.concurrency));
  const items = grid.length;
  const stages = grid[0]?.length ?? 0;

  const slots: Slot[][] = grid.map((row, item) =>
    row.map((draw, stage) => ({
      item,
      stage,
      ticks: Math.max(1, toTicks(draw.minutes)),
      ready: null,
      start: null,
      end: null,
      status: 'pending',
    })),
  );

  const alive = Array.from({ length: items }, () => true);
  const remaining = Array.from({ length: stages }, () => items);
  const barrierTicks: number[] = [];
  const queue: Slot[] = [];
  let running: Slot[] = [];
  let failure: RunFailure | null = null;
  const logged: string[] = [];

  const enqueue = (slot: Slot, time: number): void => {
    slot.ready = time;
    queue.push(slot);
  };

  const skip = (slot: Slot): void => {
    slot.status = 'skipped';
    remaining[slot.stage] -= 1;
  };

  /** Releases stage `stage` for `parallel` once every slot before it has resolved. */
  const releaseStage = (stage: number, time: number): void => {
    for (let current = stage; current < stages; current += 1) {
      barrierTicks.push(time);
      for (let item = 0; item < items; item += 1) {
        const slot = slots[item][current];
        if (alive[item]) enqueue(slot, time);
        else skip(slot);
      }
      // A stage with nothing left to run resolves at once, and so releases the next.
      if (remaining[current] > 0) return;
    }
  };

  for (let item = 0; item < items; item += 1) {
    if (stages > 0) enqueue(slots[item][0], 0);
  }

  let time = 0;

  while (failure === null) {
    queue.sort(compareReady);
    while (running.length < concurrency && queue.length > 0) {
      const slot = queue.shift()!;
      slot.start = time;
      slot.end = time + slot.ticks;
      slot.status = 'running';
      running.push(slot);
    }

    if (running.length === 0) break;

    time = Math.min(...running.map((slot) => slot.end!));
    const finished = running
      .filter((slot) => slot.end === time)
      .sort((first, second) => first.item - second.item || first.stage - second.stage);
    running = running.filter((slot) => slot.end !== time);

    for (const slot of finished) {
      const draw = grid[slot.item][slot.stage];
      slot.status = draw.outcome;
      remaining[slot.stage] -= 1;

      if (draw.outcome === 'error') {
        const message = `${strategy}[${slot.item}] failed: schema validation failed after ${options.validationAttempts} ${options.validationAttempts === 1 ? 'attempt' : 'attempts'}`;

        if (errorHandling === 'uncaught') {
          failure ??= { item: slot.item, stage: slot.stage, time: toMinutes(time) };
        } else {
          logged.push(message);
        }
      }

      if (draw.outcome !== 'value') alive[slot.item] = false;

      if (strategy === 'pipeline') {
        const next = slots[slot.item][slot.stage + 1];
        if (next && draw.outcome === 'value') enqueue(next, time);
        // `pipeline()` stops an item at its first null, so its later stages never run.
        else if (next)
          for (let stage = slot.stage + 1; stage < stages; stage += 1)
            skip(slots[slot.item][stage]);
      } else if (remaining[slot.stage] === 0 && slot.stage + 1 < stages) {
        releaseStage(slot.stage + 1, time);
      }
    }
  }

  if (failure !== null) {
    for (const slot of running) {
      slot.status = 'abandoned';
      slot.end = time;
    }
    for (const row of slots) {
      for (const slot of row) {
        if (slot.status === 'pending') slot.status = 'not-started';
      }
    }
  }

  const agents: ScheduledAgent[] = slots.flat().map((slot) => ({
    item: slot.item,
    stage: slot.stage,
    minutes: toMinutes(slot.ticks),
    ready: slot.ready === null ? null : toMinutes(slot.ready),
    start: slot.start === null ? null : toMinutes(slot.start),
    end: slot.end === null ? null : toMinutes(slot.end),
    status: slot.status === 'pending' || slot.status === 'running' ? 'not-started' : slot.status,
    attempts: grid[slot.item][slot.stage].attempts,
  }));

  const makespan = toMinutes(
    failure === null ? Math.max(0, ...slots.flat().map((slot) => slot.end ?? 0)) : time,
  );

  const results: ItemResult[] | null =
    failure === null
      ? slots.map((row, item) => {
          const ended = row.find((slot) => slot.status === 'null' || slot.status === 'error');

          return ended
            ? {
                item,
                value: 'null',
                reason: ended.status === 'error' ? 'error' : 'stopped',
                stage: ended.stage,
              }
            : { item, value: 'value', reason: 'value', stage: null };
        })
      : null;

  return {
    strategy,
    agents,
    makespan,
    barriers: strategy === 'parallel' ? barrierTicks.map(toMinutes) : [],
    failure,
    results,
    logged,
  };
};

/** The total minutes of agent work in a grid, which is the makespan at a concurrency of 1. */
export const totalWork = (grid: AgentGrid): number =>
  toMinutes(grid.flat().reduce((sum, draw) => sum + Math.max(1, toTicks(draw.minutes)), 0));
