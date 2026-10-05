import { normalQuantile } from './t-distribution';

export type PlannerInputs = {
  /** The expected standard deviation: of each group's values, or of the per-task differences when paired. */
  sigma: number;
  /** The smallest difference worth detecting, in the same unit. */
  delta: number;
  alpha: number;
  power: number;
  paired: boolean;
};

export type PlannerResult = {
  /** The formula's value before rounding, such as 62.79. */
  exact: number;
  /** Tasks per condition when unpaired; tasks, each run under both, when paired. */
  tasks: number;
};

export const alphaOptions = [0.01, 0.05, 0.1] as const;
export const powerOptions = [0.8, 0.9, 0.95] as const;

/**
 * How many tasks it takes to detect a difference of `delta` with the given
 * power, by the normal approximation:
 *
 * - unpaired, per condition: 2 × (z₁₋α/₂ + z_power)² × σ² / δ²
 * - paired, in tasks: (z₁₋α/₂ + z_power)² × σ_d² / δ²
 *
 * Rounded up, since a fraction of a task can't be run. At least two, because
 * one task per condition says nothing about spread.
 */
export const plannedTasks = ({
  sigma,
  delta,
  alpha,
  power,
  paired,
}: PlannerInputs): PlannerResult | null => {
  if (!(sigma > 0) || !(delta > 0) || !(alpha > 0 && alpha < 1) || !(power > 0 && power < 1)) {
    return null;
  }

  const z = normalQuantile(1 - alpha / 2) + normalQuantile(power);
  const exact = ((paired ? 1 : 2) * z * z * sigma * sigma) / (delta * delta);
  if (!Number.isFinite(exact)) return null;

  // A value a hair above a whole number from floating point shouldn't cost a whole task.
  return { exact, tasks: Math.max(2, Math.ceil(exact - 1e-9)) };
};
