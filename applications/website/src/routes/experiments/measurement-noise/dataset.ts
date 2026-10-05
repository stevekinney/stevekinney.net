import type { ColumnMapping } from './columns';
import type { RawTable } from './parse-table';

/** One task under one condition, after parsing. Optional fields are null when absent or unreadable. */
export type TaskRow = {
  /** 1 for the first data row, not counting the header. */
  row: number;
  condition: string;
  task: string | null;
  minutes: number | null;
  accepted: boolean | null;
  rework: boolean | null;
  reviewMinutes: number | null;
  cost: number | null;
};

export type RowIssue = {
  row: number;
  message: string;
  /** Whether the whole row was left out, or only one of its values. */
  skipped: boolean;
};

export type Dataset = {
  /** The two condition labels, in the order they first appear. The first is A, the baseline. */
  labels: string[];
  rows: TaskRow[];
  issues: RowIssue[];
  /** Every issue found, including any past the listed ones. */
  issueCount: number;
  /** Data rows read, before any were skipped. */
  total: number;
};

/**
 * The largest duration, review time, or cost a row may hold: about 1,900 years
 * of minutes. Anything bigger is a typo, and values near the top of the
 * floating-point range would overflow every sum built from them.
 */
export const MAX_AMOUNT = 1_000_000_000;

/** Issues past this many are counted but not listed, so a messy 50,000-row file stays readable. */
export const MAX_LISTED_ISSUES = 200;

/**
 * Reads a number such as `45`, `45.5`, `1,250`, or `$1.20`. Returns null for
 * anything else, including text like `45 min`.
 */
export const parseNumber = (text: string): number | null => {
  const normalized = text
    .trim()
    .replace(/^\$/, '')
    .replace(/,(?=\d{3}\b)/g, '');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) return null;

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
};

const TRUE = new Set(['true', 't', 'yes', 'y', '1', 'accepted', 'merged', 'pass', 'passed']);
const FALSE = new Set(['false', 'f', 'no', 'n', '0', 'rejected', 'fail', 'failed']);

/** Reads true or false, including yes and no and 1 and 0. Returns null for anything else. */
export const parseBoolean = (text: string): boolean | null => {
  const normalized = text.trim().toLowerCase();
  if (TRUE.has(normalized)) return true;
  if (FALSE.has(normalized)) return false;

  return null;
};

const quote = (text: string): string => `“${text.length > 40 ? `${text.slice(0, 40)}…` : text}”`;

/**
 * Turns a table and a column mapping into task rows. A row is skipped when it
 * has no condition, a third condition, or a duration that isn't a positive
 * number; each skip is reported with its reason. An unreadable optional value
 * is left blank and reported too.
 */
export const buildDataset = (table: RawTable, mapping: ColumnMapping): Dataset => {
  const labels: string[] = [];
  const rows: TaskRow[] = [];
  const issues: RowIssue[] = [];
  let issueCount = 0;

  const report = (issue: RowIssue): void => {
    issueCount += 1;
    if (issues.length < MAX_LISTED_ISSUES) issues.push(issue);
  };

  const cell = (cells: string[], index: number | null): string =>
    index === null ? '' : (cells[index] ?? '').trim();

  table.rows.forEach((cells, index) => {
    const row = index + 1;
    const condition = cell(cells, mapping.condition);

    if (condition === '') {
      report({ row, message: 'it has no condition', skipped: true });

      return;
    }

    if (!labels.includes(condition)) {
      if (labels.length === 2) {
        report({
          row,
          message: `its condition, ${quote(condition)}, is a third one. This tool compares two.`,
          skipped: true,
        });

        return;
      }
      labels.push(condition);
    }

    let minutes: number | null = null;
    if (mapping.minutes !== null) {
      const text = cell(cells, mapping.minutes);
      if (text === '') {
        report({ row, message: 'it has no duration', skipped: true });

        return;
      }

      const value = parseNumber(text);
      if (value === null) {
        report({ row, message: `its duration, ${quote(text)}, isn’t a number`, skipped: true });

        return;
      }
      if (value <= 0) {
        report({
          row,
          message: `its duration, ${text}, isn’t more than zero minutes`,
          skipped: true,
        });

        return;
      }
      if (value > MAX_AMOUNT) {
        report({
          row,
          message: `its duration, ${quote(text)}, is more than a billion minutes, which can’t be right`,
          skipped: true,
        });

        return;
      }
      minutes = value;
    }

    const readBoolean = (index: number | null, name: string): boolean | null => {
      const text = cell(cells, index);
      if (text === '') return null;

      const value = parseBoolean(text);
      if (value === null) {
        report({
          row,
          message: `${name} ${quote(text)} isn’t true or false, so it’s left blank`,
          skipped: false,
        });
      }

      return value;
    };

    const readAmount = (index: number | null, name: string): number | null => {
      const text = cell(cells, index);
      if (text === '') return null;

      const value = parseNumber(text);
      if (value === null || value < 0 || value > MAX_AMOUNT) {
        report({
          row,
          message:
            value !== null && value > MAX_AMOUNT
              ? `${name} ${quote(text)} is more than a billion, so it’s left blank`
              : `${name} ${quote(text)} isn’t a number of zero or more, so it’s left blank`,
          skipped: false,
        });

        return null;
      }

      return value;
    };

    const task = cell(cells, mapping.task);

    rows.push({
      row,
      condition,
      task: task === '' ? null : task,
      minutes,
      accepted: readBoolean(mapping.accepted, 'accepted'),
      rework: readBoolean(mapping.rework, 'rework'),
      reviewMinutes: readAmount(mapping.reviewMinutes, 'review minutes'),
      cost: readAmount(mapping.cost, 'cost'),
    });
  });

  return { labels, rows, issues, issueCount, total: table.rows.length };
};

/** Makes the second condition the baseline, A, instead of the first one the data happened to list. */
export const swapConditions = (dataset: Dataset): Dataset =>
  dataset.labels.length === 2
    ? { ...dataset, labels: [dataset.labels[1], dataset.labels[0]] }
    : dataset;
