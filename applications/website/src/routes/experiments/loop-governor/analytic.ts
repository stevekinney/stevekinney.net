import { anyAutomaticGovernor, claimChance, progressChance } from './loop-config';
import type { Config } from './loop-config';
import type { Tally } from './simulate';

/** With one progress iteration needed and no lies, the wait for success is geometric. */
export const expectedIterations = (p: number): number => (p > 0 ? 1 / p : Number.POSITIVE_INFINITY);

/** The chance of at least one progress iteration within `m` tries: `1 − (1 − p)^M`. */
export const successWithin = (p: number, m: number): number => 1 - (1 - p) ** m;

/**
 * Trusting the marker alone with one progress iteration needed, the chance a
 * false "done" comes before the true one: `(1 − p)q / (p + (1 − p)q)`.
 */
export const falseDoneBeforeTrue = (p: number, q: number): number => {
  const lie = (1 - p) * q;
  const total = p + lie;

  return total > 0 ? lie / total : 0;
};

export type AnalyticRow = {
  id: 'expected-iterations' | 'success-within' | 'false-done' | 'first-iteration-throw';
  label: string;
  /** The formula with this configuration's numbers in it. */
  formula: string;
  exact: number;
  /** The same quantity measured from the simulated runs. */
  simulated: number;
  /** `share` values print as percentages, `count` values as plain numbers. */
  kind: 'share' | 'count';
};

const trimmed = (value: number): string => String(Number(value.toFixed(4)));

const mean = (values: ArrayLike<number>): number => {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) sum += values[index];

  return values.length > 0 ? sum / values.length : 0;
};

/**
 * The closed forms that apply to a configuration, each beside its Monte Carlo
 * estimate. A form only appears when its assumptions hold, so the two columns
 * converge as the run count grows.
 */
export const analyticRows = (config: Config, tally: Tally): AnalyticRow[] => {
  const rows: AnalyticRow[] = [];
  if (tally.runs === 0) return rows;

  const p = progressChance(config);
  const q = claimChance(config);
  const share = (count: number): number => count / tally.runs;
  const others =
    config.governors.budget || config.governors.stall || config.governors.repeatedFailure;
  const basic = !config.impossible && config.k === 1 && config.e === 0 && p > 0;
  const noLies = q === 0 || config.dual;

  if (basic && noLies && !anyAutomaticGovernor(config)) {
    rows.push({
      id: 'expected-iterations',
      label: 'Average iterations to finish',
      formula: `1/p = 1/${trimmed(p)}`,
      exact: expectedIterations(p),
      simulated: mean(tally.iterations),
      kind: 'count',
    });
  }

  if (basic && noLies && config.governors.maxIterations && !others) {
    rows.push({
      id: 'success-within',
      label: `Done honestly within ${config.maxIterations} iterations`,
      formula: `1 − (1 − ${trimmed(p)})^${config.maxIterations}`,
      exact: successWithin(p, config.maxIterations),
      simulated: share(tally.outcomes['done-honest']),
      kind: 'share',
    });
  }

  if (basic && !config.dual && !anyAutomaticGovernor(config)) {
    rows.push({
      id: 'false-done',
      label: 'False done before true done',
      formula: `(1 − p) × q / (p + (1 − p) × q) = ${trimmed((1 - p) * q)} / ${trimmed(p + (1 - p) * q)}`,
      exact: falseDoneBeforeTrue(p, q),
      simulated: share(tally.outcomes['done-false']),
      kind: 'share',
    });
  }

  if (config.e > 0) {
    const failingOpen = config.failureMode === 'open';

    rows.push({
      id: 'first-iteration-throw',
      label: failingOpen
        ? 'Falsely done on iteration 1 because the measurement threw'
        : 'Broken on iteration 1 because the measurement threw',
      formula: `e = ${trimmed(config.e)}`,
      exact: config.e,
      // A marker-only loop can also end falsely done on iteration 1 through a lie, so
      // this counts only the runs whose measurement threw.
      simulated: share(tally.firstIterationThrows),
      kind: 'share',
    });
  }

  return rows;
};
