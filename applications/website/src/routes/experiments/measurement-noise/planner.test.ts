import { describe, expect, it } from 'vitest';

import { plannedTasks } from './planner';

describe('acceptance 3: the sample-size planner', () => {
  it('reports 63 tasks per condition for σ = 10 and δ = 5 at α 0.05 and power 0.8, because 62.79 rounds up', () => {
    const result = plannedTasks({ sigma: 10, delta: 5, alpha: 0.05, power: 0.8, paired: false });

    expect(result?.exact.toFixed(2)).toBe('62.79');
    expect(result?.tasks).toBe(63);
  });

  it('needs half as many tasks paired, using the spread of the differences', () => {
    const result = plannedTasks({ sigma: 10, delta: 5, alpha: 0.05, power: 0.8, paired: true });

    expect(result?.exact.toFixed(2)).toBe('31.40');
    expect(result?.tasks).toBe(32);
  });

  it('needs more tasks for a stricter α or more power', () => {
    const base = { sigma: 10, delta: 5, paired: false };

    expect(plannedTasks({ ...base, alpha: 0.01, power: 0.8 })?.tasks).toBe(94);
    expect(plannedTasks({ ...base, alpha: 0.05, power: 0.9 })?.tasks).toBe(85);
  });

  it('never asks for fewer than two tasks', () => {
    expect(
      plannedTasks({ sigma: 1, delta: 50, alpha: 0.05, power: 0.8, paired: true })?.tasks,
    ).toBe(2);
  });

  it('returns null when there is nothing to plan for', () => {
    expect(
      plannedTasks({ sigma: 10, delta: 0, alpha: 0.05, power: 0.8, paired: false }),
    ).toBeNull();
    expect(plannedTasks({ sigma: 0, delta: 5, alpha: 0.05, power: 0.8, paired: false })).toBeNull();
    expect(plannedTasks({ sigma: 10, delta: 5, alpha: 0, power: 0.8, paired: false })).toBeNull();
  });
});
