import { differenceDecimals, formatNumber, intervalDecimals } from './display';
import { plannedTasks } from './planner';
import { pairedTest, variance, welchTest } from './statistics';
import type { DifferenceTest } from './statistics';

/**
 * Five tasks, each timed under A and under B, in minutes. Every task is
 * quicker under B, but the tasks themselves range from 26 to 70 minutes.
 */
export const EXAMPLE = {
  a: [40, 55, 30, 70, 45],
  b: [35, 46, 26, 60, 38],
} as const;

export type VerdictKind = 'distinguishable' | 'cant-tell';

export type Comparison = {
  paired: boolean;
  a: readonly number[];
  b: readonly number[];
  /** A − B with its 95% t interval: positive when B is quicker. */
  test: DifferenceTest;
  kind: VerdictKind;
  /** Tasks it would take to see a difference this size; null when that can't be planned. */
  tasks: number | null;
};

/**
 * Compares A with B: a paired t interval on the per-task differences, or
 * Welch's interval on two separate groups. Null below two tasks a side, or two
 * pairs, because that says nothing about spread.
 */
export const compare = (
  a: readonly number[],
  b: readonly number[],
  paired: boolean,
): Comparison | null => {
  let test: DifferenceTest | null;
  let sigma: number;

  if (paired) {
    const result = pairedTest(a, b);
    test = result;
    sigma = result?.differenceDeviation ?? Number.NaN;
  } else {
    test = welchTest(a, b);
    sigma = Math.sqrt((variance(a) + variance(b)) / 2);
  }

  if (!test) return null;

  return {
    paired,
    a,
    b,
    test,
    kind: test.lower > 0 || test.upper < 0 ? 'distinguishable' : 'cant-tell',
    tasks: plannedTasks(sigma, Math.abs(test.difference), paired),
  };
};

export type VerdictText = {
  kind: VerdictKind;
  headline: string;
  body: string;
  /** How many tasks would settle a "can't tell", in one sentence. */
  plan: string | null;
};

/** The verdict in words. B is always the condition being described. */
export const describeComparison = ({ paired, test, kind, tasks }: Comparison): VerdictText => {
  const decimals = intervalDecimals(test.lower, test.upper);
  const show = (value: number): string => formatNumber(Math.abs(value), decimals);

  if (kind === 'distinguishable') {
    const faster = test.lower > 0;
    const [low, high] = faster ? [test.lower, test.upper] : [-test.upper, -test.lower];

    return {
      kind,
      headline: 'Distinguishable.',
      body: `B is ${show(low)}–${show(high)} minutes ${faster ? 'faster' : 'slower'} per task than A. The 95% interval leaves out zero.`,
      plan: null,
    };
  }

  // The first end that isn't zero names B; the second doesn't repeat it.
  const end = (value: number, faster: boolean, named: boolean): string =>
    value === 0
      ? 'no difference at all'
      : `${named ? 'B being ' : ''}${show(value)} minutes ${faster ? 'faster' : 'slower'}`;

  const seen = formatNumber(Math.abs(test.difference), differenceDecimals(test.lower, test.upper));

  return {
    kind,
    headline: 'Can’t tell.',
    body: `The data is consistent with anything from ${end(test.lower, false, true)} to ${end(test.upper, true, test.lower === 0)} per task.`,
    plan:
      tasks === null
        ? null
        : `You’d need about ${tasks} tasks${paired ? ', each done both ways,' : ' per condition'} to reliably see a difference this size (${seen} minutes).`,
  };
};

/**
 * A typed cell as minutes: null when it's blank, undefined when it isn't a
 * number of minutes.
 */
export const parseMinutes = (text: string): number | null | undefined => {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const value = Number(trimmed);

  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

/**
 * The typed grid as two lists of minutes. Paired, a row counts only when both
 * of its cells hold a number, so the tasks still line up. Unpaired, every
 * number counts on its own side.
 */
export const readGrid = (
  rows: readonly { a: string; b: string }[],
  paired: boolean,
): { a: number[]; b: number[] } => {
  const a: number[] = [];
  const b: number[] = [];

  for (const row of rows) {
    const valueA = parseMinutes(row.a);
    const valueB = parseMinutes(row.b);
    const okA = typeof valueA === 'number';
    const okB = typeof valueB === 'number';

    if (paired) {
      if (okA && okB) {
        a.push(valueA);
        b.push(valueB);
      }
    } else {
      if (okA) a.push(valueA);
      if (okB) b.push(valueB);
    }
  }

  return { a, b };
};
