/**
 * Two ways to run items through stages, with every agent free to start as soon
 * as it's ready. `barrier` waits for every item to finish a stage before any
 * item starts the next. `pipeline` passes each item along as soon as it's done.
 */
export type Handoff = 'barrier' | 'pipeline';

export type Bar = { item: number; stage: number; start: number; end: number };

export type StageSchedule = {
  bars: Bar[];
  /** When the last bar ends. */
  makespan: number;
  /** For `barrier`: when each stage after the first was released. Empty for `pipeline`. */
  barriers: number[];
};

export const STAGE_NAMES = ['Find', 'Fix'] as const;

/**
 * Minutes for each item (rows) and stage (columns). The slow item comes first
 * in stage 1 and last in stage 2, so each stage's slowest agent belongs to a
 * different item: 26 minutes of work either way.
 */
export const SLOW_FIRST_SLOW_LAST: readonly (readonly number[])[] = [
  [1, 10],
  [1, 1],
  [1, 1],
  [10, 1],
];

export const totalWork = (grid: readonly (readonly number[])[]): number =>
  grid.flat().reduce((sum, minutes) => sum + minutes, 0);

export const schedule = (grid: readonly (readonly number[])[], handoff: Handoff): StageSchedule => {
  const stages = grid[0]?.length ?? 0;
  const ends = grid.map(() => 0);
  const bars: Bar[] = [];
  const barriers: number[] = [];

  for (let stage = 0; stage < stages; stage += 1) {
    const release = stage > 0 && handoff === 'barrier' ? Math.max(...ends) : 0;
    if (stage > 0 && handoff === 'barrier') barriers.push(release);

    grid.forEach((row, item) => {
      const start = handoff === 'barrier' ? release : ends[item];
      const end = start + row[stage];

      bars.push({ item, stage, start, end });
      ends[item] = end;
    });
  }

  return { bars, makespan: Math.max(0, ...ends), barriers };
};
