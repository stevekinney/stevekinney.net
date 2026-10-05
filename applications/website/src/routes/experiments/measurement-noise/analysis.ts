import type { Dataset, TaskRow } from './dataset';
import { plannedTasks } from './planner';
import type { PlannerResult } from './planner';
import {
  mean,
  pairedTest,
  rateDifference,
  standardDeviation,
  variance,
  welchTest,
  wilsonInterval,
} from './statistics';
import type { PairedTest, Proportion, WelchTest } from './statistics';

/** What the verdict is about. Each is better when lower, so A − B > 0 favors B. */
export type Endpoint = 'time' | 'rework' | 'review';

export const endpointLabels: Record<Endpoint, string> = {
  time: 'Time to accepted result',
  rework: 'Rework rate',
  review: 'Review minutes',
};

export type Design = 'paired' | 'unpaired';

export type Pairing = { possible: true; tasks: number } | { possible: false; reason: string };

/** A continuous outcome, such as minutes, compared by mean. */
export type MeanComparison = {
  kind: 'mean';
  design: Design;
  pairing: Pairing;
  valuesA: number[];
  valuesB: number[];
  /** Task names in the same order as the values, when paired. */
  tasks: string[];
  test: WelchTest | PairedTest;
  /** The difference as a percentage of A's mean. */
  percent: number;
  /** The spread the planner should use: of each group (pooled), or of the differences when paired. */
  sigma: number;
};

/** A yes-or-no outcome, such as rework, compared by rate. */
export type RateComparison = {
  kind: 'rate';
  a: Proportion;
  b: Proportion;
  difference: number;
  lower: number;
  upper: number;
};

export type Verdict =
  | { kind: 'distinguishable'; lower: number; upper: number }
  | { kind: 'cant-tell'; lower: number; upper: number; planner: PlannerResult | null }
  | { kind: 'not-measured'; reason: string; degenerate: boolean };

export type Analysis = {
  /** The two condition labels, A first. Fewer when the data has fewer. */
  labels: string[];
  endpoint: Endpoint;
  /** Endpoints the data has a column for. */
  endpoints: Endpoint[];
  /** The verdict's comparison, or null when it can't be made. */
  comparison: MeanComparison | RateComparison | null;
  /** Null when the data has no outcome column at all, so there's nothing to give a verdict on. */
  verdict: Verdict | null;
};

export type AnalysisSettings = {
  endpoint: Endpoint;
  /** Pair tasks when the data allows it. */
  preferPaired: boolean;
  /** For the planner's sample size in a "can't tell" verdict. */
  alpha: number;
  power: number;
};

const measureOf = (endpoint: 'time' | 'review') => (row: TaskRow) =>
  endpoint === 'time' ? row.minutes : row.reviewMinutes;

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/**
 * Whether every task appears exactly once under each condition. When it
 * doesn't, the reason says why in words a person can act on.
 */
export const checkPairing = (rowsA: TaskRow[], rowsB: TaskRow[], labels: string[]): Pairing => {
  const all = [...rowsA, ...rowsB];
  if (all.length === 0) return { possible: false, reason: 'There are no rows to pair.' };
  if (all.every((row) => row.task === null)) {
    return {
      possible: false,
      reason:
        'There’s no task column, so there’s no way to tell which times belong to the same task.',
    };
  }

  const missing = all.filter((row) => row.task === null).length;
  if (missing > 0) {
    return {
      possible: false,
      reason: `${plural(missing, 'row')} ${missing === 1 ? 'has' : 'have'} no task name.`,
    };
  }

  const count = (rows: TaskRow[], label: string): Map<string, number> | string => {
    const seen = new Map<string, number>();
    for (const row of rows) {
      const task = row.task as string;
      if (seen.has(task)) return `Task “${task}” appears more than once under ${label}.`;
      seen.set(task, 1);
    }

    return seen;
  };

  const seenA = count(rowsA, labels[0]);
  if (typeof seenA === 'string') return { possible: false, reason: seenA };
  const seenB = count(rowsB, labels[1]);
  if (typeof seenB === 'string') return { possible: false, reason: seenB };

  const onlyA = [...seenA.keys()].filter((task) => !seenB.has(task));
  const onlyB = [...seenB.keys()].filter((task) => !seenA.has(task));
  const unmatched = onlyA.length + onlyB.length;
  if (unmatched > 0) {
    const example = onlyA[0] ?? onlyB[0];

    return {
      possible: false,
      reason: `${plural(unmatched, 'task')} ${unmatched === 1 ? 'appears' : 'appear'} under only one condition, such as “${example}”. Pairing needs every task under both.`,
    };
  }

  return { possible: true, tasks: seenA.size };
};

/** Compares a continuous outcome by mean, paired when allowed and asked for, otherwise Welch. */
export const compareMeans = (
  rowsA: TaskRow[],
  rowsB: TaskRow[],
  labels: string[],
  value: (row: TaskRow) => number | null,
  preferPaired: boolean,
): MeanComparison | null => {
  const withA = rowsA.filter((row) => value(row) !== null);
  const withB = rowsB.filter((row) => value(row) !== null);
  const pairing = checkPairing(withA, withB, labels);

  if (pairing.possible && preferPaired) {
    const byTask = new Map(withB.map((row) => [row.task as string, row]));
    const tasks = withA.map((row) => row.task as string);
    const valuesA = withA.map((row) => value(row) as number);
    const valuesB = tasks.map((task) => value(byTask.get(task) as TaskRow) as number);
    const test = pairedTest(valuesA, valuesB);
    if (!test) return null;

    return {
      kind: 'mean',
      design: 'paired',
      pairing,
      valuesA,
      valuesB,
      tasks,
      test,
      percent: (test.difference / test.meanA) * 100,
      sigma: test.differenceDeviation,
    };
  }

  const valuesA = withA.map((row) => value(row) as number);
  const valuesB = withB.map((row) => value(row) as number);
  const test = welchTest(valuesA, valuesB);
  if (!test) return null;

  return {
    kind: 'mean',
    design: 'unpaired',
    pairing,
    valuesA,
    valuesB,
    tasks: [],
    test,
    percent: (test.difference / test.meanA) * 100,
    sigma: Math.sqrt((variance(valuesA) + variance(valuesB)) / 2),
  };
};

/** Compares a yes-or-no outcome by rate, with Wilson intervals and Newcombe's interval for the gap. */
export const compareRates = (
  rowsA: TaskRow[],
  rowsB: TaskRow[],
  value: (row: TaskRow) => boolean | null,
): RateComparison | null => {
  const count = (rows: TaskRow[]): [number, number] => {
    let yes = 0;
    let total = 0;
    for (const row of rows) {
      const answer = value(row);
      if (answer === null) continue;
      total += 1;
      if (answer) yes += 1;
    }

    return [yes, total];
  };

  const a = wilsonInterval(...count(rowsA));
  const b = wilsonInterval(...count(rowsB));
  if (!a || !b) return null;

  return { kind: 'rate', a, b, ...rateDifference(a, b) };
};

const notMeasured = (reason: string, degenerate = false): Verdict => ({
  kind: 'not-measured',
  reason,
  degenerate,
});

/** Splits rows by condition. */
export const splitRows = (dataset: Dataset): [TaskRow[], TaskRow[]] => {
  const [labelA, labelB] = dataset.labels;
  const rowsA: TaskRow[] = [];
  const rowsB: TaskRow[] = [];
  for (const row of dataset.rows) {
    if (row.condition === labelA) rowsA.push(row);
    else if (row.condition === labelB) rowsB.push(row);
  }

  return [rowsA, rowsB];
};

export type AvailableColumns = { minutes: boolean; rework: boolean; reviewMinutes: boolean };

export const analyze = (
  dataset: Dataset,
  columns: AvailableColumns,
  settings: AnalysisSettings,
): Analysis => {
  const endpoints: Endpoint[] = [];
  if (columns.minutes) endpoints.push('time');
  if (columns.rework) endpoints.push('rework');
  if (columns.reviewMinutes) endpoints.push('review');

  const endpoint = endpoints.includes(settings.endpoint) ? settings.endpoint : endpoints[0];
  const { labels } = dataset;

  if (!endpoint) {
    return { labels, endpoint: settings.endpoint, endpoints, comparison: null, verdict: null };
  }

  const base = { labels, endpoint, endpoints };

  if (labels.length === 0) {
    return { ...base, comparison: null, verdict: notMeasured('There’s no data to compare yet.') };
  }
  if (labels.length === 1) {
    return {
      ...base,
      comparison: null,
      verdict: notMeasured(
        `Every row is under one condition, “${labels[0]}”, so there’s no baseline to compare it with.`,
      ),
    };
  }

  const [rowsA, rowsB] = splitRows(dataset);
  const what =
    endpoint === 'rework'
      ? 'a rework value'
      : endpoint === 'time'
        ? 'a duration'
        : 'review minutes';
  const counted = (rows: TaskRow[]): number =>
    rows.filter((row) =>
      endpoint === 'rework' ? row.rework !== null : measureOf(endpoint)(row) !== null,
    ).length;
  const thin = [
    [labels[0], counted(rowsA)],
    [labels[1], counted(rowsB)],
  ].find(([, count]) => (count as number) < 2);

  if (thin) {
    const [label, count] = thin as [string, number];

    return {
      ...base,
      comparison: null,
      verdict: notMeasured(
        `“${label}” has ${count === 0 ? 'no tasks' : 'only one task'} with ${what}. It takes at least two under each condition to see how much tasks vary.`,
      ),
    };
  }

  if (endpoint === 'rework') {
    const comparison = compareRates(rowsA, rowsB, (row) => row.rework);
    if (!comparison)
      return { ...base, comparison: null, verdict: notMeasured('There’s no rework data.') };

    return {
      ...base,
      comparison,
      verdict:
        comparison.lower > 0 || comparison.upper < 0
          ? { kind: 'distinguishable', lower: comparison.lower, upper: comparison.upper }
          : { kind: 'cant-tell', lower: comparison.lower, upper: comparison.upper, planner: null },
    };
  }

  const comparison = compareMeans(rowsA, rowsB, labels, measureOf(endpoint), settings.preferPaired);
  if (!comparison)
    return { ...base, comparison: null, verdict: notMeasured('There’s not enough data.') };

  const { test } = comparison;
  if (test.degenerate) {
    return {
      ...base,
      comparison,
      verdict: notMeasured(
        comparison.design === 'paired'
          ? 'Every task’s difference is exactly the same, so the interval is degenerate: a single point with no spread to judge the noise by. Real timings vary; check the data.'
          : 'Every task under each condition has exactly the same value, so the interval is degenerate: a single point with no spread to judge the noise by. Real timings vary; check the data.',
        true,
      ),
    };
  }

  if (test.lower > 0 || test.upper < 0) {
    return {
      ...base,
      comparison,
      verdict: { kind: 'distinguishable', lower: test.lower, upper: test.upper },
    };
  }

  return {
    ...base,
    comparison,
    verdict: {
      kind: 'cant-tell',
      lower: test.lower,
      upper: test.upper,
      planner: plannedTasks({
        sigma: comparison.sigma,
        delta: Math.abs(test.difference),
        alpha: settings.alpha,
        power: settings.power,
        paired: comparison.design === 'paired',
      }),
    },
  };
};

/** Cost per accepted result for one condition: total cost over accepted tasks. */
export type CostPerAccepted = {
  totalCost: number;
  accepted: number;
  tasks: number;
  /** Null when nothing was accepted, so there's no result to divide by. */
  value: number | null;
};

export const costPerAccepted = (rows: TaskRow[]): CostPerAccepted | null => {
  const usable = rows.filter((row) => row.cost !== null && row.accepted !== null);
  if (usable.length === 0) return null;

  const totalCost = usable.reduce((total, row) => total + (row.cost as number), 0);
  const accepted = usable.filter((row) => row.accepted).length;

  return {
    totalCost,
    accepted,
    tasks: usable.length,
    value: accepted === 0 ? null : totalCost / accepted,
  };
};

/** The mean and spread of one group, for the dot plot's per-condition bars. */
export const groupSummary = (
  values: readonly number[],
): { mean: number; deviation: number; count: number } => ({
  mean: mean(values),
  deviation: values.length > 1 ? standardDeviation(values) : 0,
  count: values.length,
});
