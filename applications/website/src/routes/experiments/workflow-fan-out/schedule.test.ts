import { describe, expect, it } from 'vitest';

import { drawAgents } from './agents';
import type { AgentGrid, AgentOutcome } from './agents';
import { defaultConfig } from './config';
import type { WorkflowConfig } from './config';
import { findPreset } from './presets';
import { simulate, totalWork } from './schedule';
import type { ScheduleOptions, Strategy } from './schedule';

/** A grid from minutes, with every agent returning a value unless an outcome says otherwise. */
const gridOf = (minutes: number[][], outcomes: AgentOutcome[][] = []): AgentGrid =>
  minutes.map((row, item) =>
    row.map((value, stage) => ({
      minutes: value,
      outcome: outcomes[item]?.[stage] ?? 'value',
      attempts: 1,
    })),
  );

const options = (
  strategy: Strategy,
  overrides: Partial<ScheduleOptions> = {},
): ScheduleOptions => ({
  strategy,
  concurrency: 16,
  errorHandling: 'caught',
  validationAttempts: 5,
  ...overrides,
});

const presetGrid = (id: string): { config: WorkflowConfig; grid: AgentGrid } => {
  const config = findPreset(id)!.config();

  return { config, grid: drawAgents(config) };
};

describe('acceptance check 1: slow first, slow last at concurrency 16', () => {
  const { config, grid } = presetGrid('slow-first-slow-last');

  it('uses stage-1 durations 1, 1, 1, 10 and stage-2 durations 10, 1, 1, 1', () => {
    expect(config.items).toBe(4);
    expect(config.concurrency).toBe(16);
    expect(grid.map((row) => row[0].minutes)).toEqual([1, 1, 1, 10]);
    expect(grid.map((row) => row[1].minutes)).toEqual([10, 1, 1, 1]);
  });

  it('finishes pipeline() in 11 minutes: item 1 takes 1 + 10 and item 4 takes 10 + 1', () => {
    const schedule = simulate(grid, options('pipeline'));

    expect(schedule.makespan).toBe(11);
    const item = (index: number) => schedule.agents.filter((agent) => agent.item === index);
    expect(item(0).map((agent) => [agent.start, agent.end])).toEqual([
      [0, 1],
      [1, 11],
    ]);
    expect(item(3).map((agent) => [agent.start, agent.end])).toEqual([
      [0, 10],
      [10, 11],
    ]);
  });

  it('finishes parallel() in 20 minutes: max(stage 1) is 10 and max(stage 2) is 10', () => {
    const schedule = simulate(grid, options('parallel'));

    expect(schedule.makespan).toBe(20);
    expect(schedule.barriers).toEqual([10]);
    expect(
      schedule.agents.filter((agent) => agent.stage === 1).map((agent) => agent.start),
    ).toEqual([10, 10, 10, 10]);
  });
});

describe('acceptance check 2: the same grid at concurrency 1', () => {
  const { config, grid } = presetGrid('concurrency-1');

  it('takes 26 minutes, 13 + 13, with both strategies', () => {
    expect(config.concurrency).toBe(1);
    expect(totalWork(grid)).toBe(26);
    expect(simulate(grid, options('pipeline', { concurrency: 1 })).makespan).toBe(26);
    expect(simulate(grid, options('parallel', { concurrency: 1 })).makespan).toBe(26);
  });

  it('never runs two agents at once', () => {
    const schedule = simulate(grid, options('pipeline', { concurrency: 1 }));
    const spans = schedule.agents
      .map((agent) => [agent.start!, agent.end!])
      .sort((first, second) => first[0] - second[0]);

    for (let index = 1; index < spans.length; index += 1) {
      expect(spans[index][0]).toBeGreaterThanOrEqual(spans[index - 1][1]);
    }
  });
});

describe('the ready queue', () => {
  it('starts ready agents by ready time, then item, then stage, and records the wait', () => {
    const schedule = simulate(
      gridOf([
        [2, 1],
        [2, 1],
        [2, 1],
      ]),
      options('pipeline', { concurrency: 2 }),
    );
    const at = (item: number, stage: number) =>
      schedule.agents.find((agent) => agent.item === item && agent.stage === stage)!;

    // Items 1 and 2 start; item 3's stage 1 is queued until a slot frees at 2.
    expect(at(2, 0)).toMatchObject({ ready: 0, start: 2, end: 4 });
    // At 2, item 3's first stage (ready at 0) goes before items 1 and 2's second stages (ready at 2).
    expect(at(0, 1)).toMatchObject({ ready: 2, start: 2, end: 3 });
    expect(at(1, 1)).toMatchObject({ ready: 2, start: 3, end: 4 });
    expect(schedule.makespan).toBe(5);
  });

  it('keeps times exact to a tenth of a minute', () => {
    const schedule = simulate(gridOf([[0.1, 0.2]]), options('pipeline'));

    expect(schedule.makespan).toBe(0.3);
  });
});

describe('edge cases', () => {
  it('makes one stage identical under both strategies', () => {
    const grid = gridOf([[3], [1], [7]]);

    expect(simulate(grid, options('pipeline')).makespan).toBe(7);
    expect(simulate(grid, options('parallel')).makespan).toBe(7);
  });

  it('handles a single item', () => {
    const grid = gridOf([[2, 5, 1]]);

    expect(simulate(grid, options('pipeline')).makespan).toBe(8);
    expect(simulate(grid, options('parallel')).makespan).toBe(8);
  });

  it('never queues when concurrency covers every agent', () => {
    const schedule = simulate(
      gridOf([
        [1, 2],
        [3, 4],
      ]),
      options('pipeline', { concurrency: 4 }),
    );

    expect(schedule.agents.every((agent) => agent.start === agent.ready)).toBe(true);
  });

  it('turns every item null when every agent fails, and skips their later stages', () => {
    const config = { ...defaultConfig(), items: 5, failureProbability: 1 };
    const schedule = simulate(drawAgents(config), options('pipeline'));

    expect(schedule.results?.every((result) => result.value === 'null')).toBe(true);
    expect(
      schedule.agents.filter((agent) => agent.stage === 1).map((agent) => agent.status),
    ).toEqual(['skipped', 'skipped', 'skipped', 'skipped', 'skipped']);
  });

  it('skips a parallel() stage entirely when no item survives the one before', () => {
    const schedule = simulate(
      gridOf(
        [
          [1, 1, 1],
          [2, 1, 1],
        ],
        [
          ['null', 'value', 'value'],
          ['null', 'value', 'value'],
        ],
      ),
      options('parallel'),
    );

    expect(schedule.makespan).toBe(2);
    expect(
      schedule.agents
        .filter((agent) => agent.stage > 0)
        .every((agent) => agent.status === 'skipped'),
    ).toBe(true);
  });
});

describe('errors', () => {
  const grid = gridOf(
    [
      [1, 1],
      [2, 1],
      [5, 1],
    ],
    [
      ['value', 'value'],
      ['error', 'value'],
      ['value', 'value'],
    ],
  );

  it('logs a caught error and leaves that slot null, as pipeline() does', () => {
    const schedule = simulate(grid, options('pipeline'));

    expect(schedule.failure).toBeNull();
    expect(schedule.results?.[1]).toEqual({ item: 1, value: 'null', reason: 'error', stage: 0 });
    expect(schedule.logged).toEqual([
      'pipeline[1] failed: schema validation failed after 5 attempts',
    ]);
    expect(schedule.makespan).toBe(6);
  });

  it('ends the run at the error when nothing catches it', () => {
    const schedule = simulate(grid, options('pipeline', { errorHandling: 'uncaught' }));

    expect(schedule.failure).toEqual({ item: 1, stage: 0, time: 2 });
    expect(schedule.results).toBeNull();
    expect(schedule.makespan).toBe(2);
    const status = (item: number, stage: number) =>
      schedule.agents.find((agent) => agent.item === item && agent.stage === stage)!.status;
    expect(status(0, 1)).toBe('value');
    expect(status(2, 0)).toBe('abandoned');
    expect(status(2, 1)).toBe('not-started');
  });
});
