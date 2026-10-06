import { normalQuantile } from './t-distribution';

/** The planner's fixed settings: a two-sided 5% test that catches a real difference 80% of the time. */
const ALPHA = 0.05;
const POWER = 0.8;

/**
 * How many tasks it takes to detect a difference of `delta` 80% of the time
 * at α = 0.05, by the normal approximation:
 *
 * - unpaired, per condition: 2 × (z₁₋α/₂ + z_power)² × σ² / δ²
 * - paired, in tasks: (z₁₋α/₂ + z_power)² × σ_d² / δ²
 *
 * `sigma` is each group's spread when unpaired, and the spread of the per-task
 * differences when paired. Rounded up, since a fraction of a task can't be run,
 * and at least two, because one task per condition says nothing about spread.
 * Null when there's no spread or no difference to plan for.
 */
export const plannedTasks = (sigma: number, delta: number, paired: boolean): number | null => {
  if (!(sigma > 0) || !(delta > 0)) return null;

  const z = normalQuantile(1 - ALPHA / 2) + normalQuantile(POWER);
  const exact = ((paired ? 1 : 2) * z * z * sigma * sigma) / (delta * delta);
  if (!Number.isFinite(exact)) return null;

  // A value a hair above a whole number from floating point shouldn't cost a whole task.
  return Math.max(2, Math.ceil(exact - 1e-9));
};
