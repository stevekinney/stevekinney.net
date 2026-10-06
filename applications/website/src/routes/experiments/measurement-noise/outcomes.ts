import { csvCell } from '$lib/experiments/csv';

import { compareMeans, compareRates, costPerAccepted, splitRows } from './analysis';
import type { BootstrapInterval } from './bootstrap';
import type { ColumnMapping } from './columns';
import type { Dataset, TaskRow } from './dataset';
import {
  formatDollars,
  formatInterval,
  formatNumber,
  formatRate,
  differenceDecimals,
  intervalDecimals,
} from './display';

export type OutcomeId = 'time' | 'rework' | 'review' | 'accepted' | 'cost';

export type OutcomeRow = {
  id: OutcomeId;
  label: string;
  /** False when the data has no column for it, and the row is greyed out. */
  available: boolean;
  /** Why a row has no figures, or how its interval was found. */
  note: string;
  unit: 'minutes' | 'rate' | 'dollars';
  a: number | null;
  b: number | null;
  /** A − B. */
  difference: number | null;
  lower: number | null;
  upper: number | null;
  /** Extra detail beside a value, such as a Wilson interval or a count. */
  aDetail: string;
  bDetail: string;
};

/** Where the cost-per-accepted bootstrap is up to. */
export type CostIntervalState = BootstrapInterval | 'running' | null;

const blank = (
  id: OutcomeId,
  label: string,
  unit: OutcomeRow['unit'],
  note: string,
  available: boolean,
): OutcomeRow => ({
  id,
  label,
  available,
  note,
  unit,
  a: null,
  b: null,
  difference: null,
  lower: null,
  upper: null,
  aDetail: '',
  bDetail: '',
});

const meanRow = (
  id: 'time' | 'review',
  label: string,
  present: boolean,
  rowsA: TaskRow[],
  rowsB: TaskRow[],
  labels: string[],
  value: (row: TaskRow) => number | null,
  preferPaired: boolean,
): OutcomeRow => {
  if (!present) return blank(id, label, 'minutes', 'Not in your data.', false);

  const comparison = compareMeans(rowsA, rowsB, labels, value, preferPaired);
  if (!comparison) {
    return blank(id, label, 'minutes', 'Needs at least two tasks under each condition.', true);
  }

  const { test } = comparison;

  return {
    id,
    label,
    available: true,
    note: test.degenerate
      ? 'Degenerate: no spread in the data.'
      : comparison.design === 'paired'
        ? `Paired t, ${comparison.valuesA.length} tasks.`
        : `Welch, ${comparison.valuesA.length} and ${comparison.valuesB.length} tasks.`,
    unit: 'minutes',
    a: test.meanA,
    b: test.meanB,
    difference: test.difference,
    lower: test.lower,
    upper: test.upper,
    aDetail: '',
    bDetail: '',
  };
};

const rateRow = (
  id: 'rework' | 'accepted',
  label: string,
  present: boolean,
  rowsA: TaskRow[],
  rowsB: TaskRow[],
  value: (row: TaskRow) => boolean | null,
): OutcomeRow => {
  if (!present) return blank(id, label, 'rate', 'Not in your data.', false);

  const comparison = compareRates(rowsA, rowsB, value);
  if (!comparison) return blank(id, label, 'rate', 'Needs values under both conditions.', true);

  const detail = (side: typeof comparison.a): string =>
    `${side.successes} of ${side.total}; 95% ${formatRate(side.lower)}–${formatRate(side.upper)}`;

  return {
    id,
    label,
    available: true,
    note: 'Wilson intervals for each rate; Newcombe’s for the gap.',
    unit: 'rate',
    a: comparison.a.rate,
    b: comparison.b.rate,
    difference: comparison.difference,
    lower: comparison.lower,
    upper: comparison.upper,
    aDetail: detail(comparison.a),
    bDetail: detail(comparison.b),
  };
};

const costRow = (
  present: boolean,
  rowsA: TaskRow[],
  rowsB: TaskRow[],
  interval: CostIntervalState,
): OutcomeRow => {
  const label = 'Cost per accepted result';
  if (!present)
    return blank('cost', label, 'dollars', 'Needs both a cost and an accepted column.', false);

  const a = costPerAccepted(rowsA);
  const b = costPerAccepted(rowsB);
  if (!a || !b) return blank('cost', label, 'dollars', 'Needs costs under both conditions.', true);

  const detail = (side: NonNullable<typeof a>): string =>
    `${formatDollars(side.totalCost)} over ${side.accepted} accepted`;
  const difference = a.value !== null && b.value !== null ? a.value - b.value : null;
  const ready = interval !== null && interval !== 'running';

  return {
    id: 'cost',
    label,
    available: true,
    note:
      difference === null
        ? 'Nothing was accepted under one condition, so there’s no cost per result.'
        : interval === 'running'
          ? 'Bootstrapping the interval…'
          : ready
            ? `Bootstrap, ${interval.resamples.toLocaleString('en-US')} resamples${
                interval.sampledRows < interval.rows
                  ? ` of a seeded subsample of ${interval.sampledRows.toLocaleString('en-US')} rows`
                  : ''
              }, seed ${interval.seed}.`
            : 'Total cost divided by accepted tasks.',
    unit: 'dollars',
    a: a.value,
    b: b.value,
    difference,
    lower: ready && difference !== null ? interval.lower : null,
    upper: ready && difference !== null ? interval.upper : null,
    aDetail: detail(a),
    bDetail: detail(b),
  };
};

/** Every outcome the tool knows, A against B, greyed out where the data has no column for it. */
export const buildOutcomes = (
  dataset: Dataset,
  mapping: ColumnMapping,
  preferPaired: boolean,
  costInterval: CostIntervalState,
): OutcomeRow[] => {
  const [rowsA, rowsB] = splitRows(dataset);
  const { labels } = dataset;

  return [
    meanRow(
      'time',
      'Time to accepted result',
      mapping.minutes !== null,
      rowsA,
      rowsB,
      labels,
      (row) => row.minutes,
      preferPaired,
    ),
    rateRow('rework', 'Rework rate', mapping.rework !== null, rowsA, rowsB, (row) => row.rework),
    meanRow(
      'review',
      'Review minutes',
      mapping.reviewMinutes !== null,
      rowsA,
      rowsB,
      labels,
      (row) => row.reviewMinutes,
      preferPaired,
    ),
    costRow(mapping.cost !== null && mapping.accepted !== null, rowsA, rowsB, costInterval),
    rateRow(
      'accepted',
      'Share of tasks accepted',
      mapping.accepted !== null,
      rowsA,
      rowsB,
      (row) => row.accepted,
    ),
  ];
};

/** One value in its unit. */
export const formatValue = (row: OutcomeRow, value: number | null): string => {
  if (value === null) return '—';
  if (row.unit === 'rate') return formatRate(value);
  if (row.unit === 'dollars') return formatDollars(value);

  return `${formatNumber(value, 1)} min`;
};

/** The difference, signed, in the row's unit: points for rates. */
export const formatDifference = (row: OutcomeRow): string => {
  if (row.difference === null) return '—';
  if (row.unit === 'rate') return `${formatNumber(row.difference * 100, 1)} pts`;
  if (row.unit === 'dollars') return formatDollars(row.difference);

  const decimals =
    row.lower !== null && row.upper !== null ? differenceDecimals(row.lower, row.upper) : 1;

  return `${formatNumber(row.difference, decimals)} min`;
};

export const formatOutcomeInterval = (row: OutcomeRow): string => {
  if (row.lower === null || row.upper === null) return '—';
  if (row.unit === 'rate') {
    return `${formatInterval(row.lower * 100, row.upper * 100, 1)} pts`;
  }
  if (row.unit === 'dollars') return `[${formatDollars(row.lower)}, ${formatDollars(row.upper)}]`;

  return `${formatInterval(row.lower, row.upper, intervalDecimals(row.lower, row.upper))} min`;
};

/** The outcome table as CSV, with plain numbers so a spreadsheet can use them. */
export const outcomesToCsv = (rows: OutcomeRow[], labels: string[]): string => {
  const [labelA = 'A', labelB = 'B'] = labels;
  const header = [
    'outcome',
    'unit',
    labelA,
    labelB,
    `difference (${labelA} - ${labelB})`,
    'interval low',
    'interval high',
    'note',
  ];
  const round = (value: number | null): number | null =>
    value === null ? null : Number(value.toFixed(6));
  const lines = rows.map((row) =>
    [
      row.label,
      row.unit,
      round(row.a),
      round(row.b),
      round(row.difference),
      round(row.lower),
      round(row.upper),
      row.note,
    ]
      .map(csvCell)
      .join(','),
  );

  return `${[header.map(csvCell).join(','), ...lines].join('\n')}\n`;
};
