import { describe, expect, it } from 'vitest';

import { schedule, SLOW_FIRST_SLOW_LAST, totalWork } from './pipelining';

describe('slow first, slow last', () => {
  it('does 26 minutes of work either way', () => {
    expect(totalWork(SLOW_FIRST_SLOW_LAST)).toBe(26);
  });

  it('finishes in 20 minutes when each stage waits for every item', () => {
    const result = schedule(SLOW_FIRST_SLOW_LAST, 'barrier');

    expect(result.makespan).toBe(20);
    expect(result.barriers).toEqual([10]);
    // Every item starts the second stage at the barrier, however early it finished the first.
    expect(result.bars.filter((bar) => bar.stage === 1).map((bar) => bar.start)).toEqual([
      10, 10, 10, 10,
    ]);
  });

  it('finishes in 11 minutes when each item is passed along', () => {
    const result = schedule(SLOW_FIRST_SLOW_LAST, 'pipeline');

    expect(result.makespan).toBe(11);
    expect(result.barriers).toEqual([]);
    expect(result.bars.find((bar) => bar.item === 0 && bar.stage === 1)).toEqual({
      item: 0,
      stage: 1,
      start: 1,
      end: 11,
    });
  });

  it('copes with an empty grid', () => {
    expect(schedule([], 'barrier')).toEqual({ bars: [], makespan: 0, barriers: [] });
  });
});
