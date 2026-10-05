import { describe, expect, it } from 'vitest';

import { drawAgents } from './agents';
import { ganttSegments, timeTicks, totalsByKind } from './gantt-geometry';
import { findPreset } from './presets';
import { simulate } from './schedule';
import type { Strategy } from './schedule';

const schedule = (id: string, strategy: Strategy) => {
  const config = findPreset(id)!.config();

  return simulate(drawAgents(config), {
    strategy,
    concurrency: config.concurrency,
    errorHandling: 'caught',
    validationAttempts: 5,
  });
};

describe('ganttSegments', () => {
  it('shades the idle time the parallel() barrier causes', () => {
    const segments = ganttSegments(schedule('slow-first-slow-last', 'parallel'));
    const idle = segments.filter((segment) => segment.kind === 'idle');

    // Items 1 to 3 finish stage 1 at 1 and wait for item 4 until 10.
    expect(idle.map((segment) => [segment.agent.item, segment.from, segment.to])).toEqual([
      [0, 1, 10],
      [1, 1, 10],
      [2, 1, 10],
    ]);
    expect(totalsByKind(segments)).toEqual({ idle: 27, queued: 0, run: 26 });
  });

  it('has no idle time under pipeline()', () => {
    const segments = ganttSegments(schedule('slow-first-slow-last', 'pipeline'));

    expect(segments.some((segment) => segment.kind === 'idle')).toBe(false);
  });

  it('hatches queued time when concurrency is the limit', () => {
    const totals = totalsByKind(ganttSegments(schedule('concurrency-1', 'pipeline')));

    expect(totals.run).toBe(26);
    expect(totals.queued).toBeGreaterThan(0);
  });

  it('clips every segment to the animation time', () => {
    const segments = ganttSegments(schedule('slow-first-slow-last', 'pipeline'), 5);

    expect(Math.max(...segments.map((segment) => segment.to))).toBe(5);
    expect(segments.filter((segment) => segment.kind === 'run')).toHaveLength(7);
  });
});

describe('timeTicks', () => {
  it('picks round steps that reach the maximum', () => {
    expect(timeTicks(20)).toEqual([0, 5, 10, 15, 20]);
    expect(timeTicks(11)).toEqual([0, 2, 4, 6, 8, 10, 12].filter((tick) => tick <= 11.002));
    expect(timeTicks(0)).toEqual([0]);
  });
});
