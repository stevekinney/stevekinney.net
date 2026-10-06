import { describe, expect, it } from 'vitest';

import { formatLines } from './display';
import { dailyBalance, defaultScenario, parseField, sustainableAgents, sweep } from './model';
import type { Scenario } from './model';

const scenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  ...defaultScenario,
  ...overrides,
});

describe('the defaults', () => {
  const balance = dailyBalance(defaultScenario);

  it('generate 1,800 lines a day against a capacity of 1,200', () => {
    expect(formatLines(balance.generated)).toBe('1,800');
    expect(formatLines(balance.capacity)).toBe('1,200');
    expect(balance.gap).toBe(600);
  });

  it('keep 2 agents fully reviewed', () => {
    expect(balance.sustainableAgents).toBe(2);
  });

  it('do not flag a 300-line pull request as larger than a day', () => {
    expect(balance.oversizedPr).toBe(false);
  });
});

describe('sustainableAgents', () => {
  it('rounds down, without floating-point error at an exact fit', () => {
    expect(sustainableAgents(scenario({ prsPerAgent: 0.1, linesPerPr: 1_200 }))).toBe(10);
    expect(sustainableAgents(scenario({ linesPerPr: 250 }))).toBe(2);
  });

  it('is null when an agent opens nothing', () => {
    expect(sustainableAgents(scenario({ prsPerAgent: 0 }))).toBeNull();
  });

  it('is zero when no sittings are left', () => {
    expect(sustainableAgents(scenario({ sittings: 0 }))).toBe(0);
  });
});

describe('dailyBalance', () => {
  it('flags a pull request larger than a whole day of sittings', () => {
    const balance = dailyBalance(scenario({ agents: 1, prsPerAgent: 0.5, linesPerPr: 1_500 }));

    expect(balance.gap).toBeLessThan(0);
    expect(balance.oversizedPr).toBe(true);
  });
});

describe('sweep', () => {
  it('runs from one agent to ten, growing by one agent’s output each step', () => {
    const points = sweep(defaultScenario);

    expect(points.map((point) => point.agents)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(points[0].generated).toBe(600);
    expect(points[9].generated).toBe(6_000);
  });
});

describe('parseField', () => {
  it('reads numbers with grouping', () => {
    expect(parseField('linesPerPr', '1,200')).toBe(1_200);
    expect(parseField('prsPerAgent', '2.5')).toBe(2.5);
  });

  it('rejects text, values out of range, and fractions in whole-number fields', () => {
    expect(parseField('agents', 'three')).toBeNull();
    expect(parseField('agents', '51')).toBeNull();
    expect(parseField('agents', '2.5')).toBeNull();
    expect(parseField('linesPerSitting', '10')).toBeNull();
  });
});
