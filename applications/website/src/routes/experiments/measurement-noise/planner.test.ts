import { describe, expect, it } from 'vitest';

import { plannedTasks } from './planner';

describe('the sample-size sentence', () => {
  it('needs 63 tasks per condition for σ = 10 and δ = 5, because 62.79 rounds up', () => {
    expect(plannedTasks(10, 5, false)).toBe(63);
  });

  it('needs half as many tasks paired, using the spread of the differences', () => {
    expect(plannedTasks(10, 5, true)).toBe(32);
  });

  it('never asks for fewer than two tasks', () => {
    expect(plannedTasks(1, 50, true)).toBe(2);
  });

  it('returns null when there is nothing to plan for', () => {
    expect(plannedTasks(10, 0, false)).toBeNull();
    expect(plannedTasks(0, 5, false)).toBeNull();
  });
});
