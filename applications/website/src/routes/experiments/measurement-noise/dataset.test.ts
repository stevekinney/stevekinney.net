import { describe, expect, it } from 'vitest';

import { guessMapping } from './columns';
import {
  buildDataset,
  MAX_LISTED_ISSUES,
  parseBoolean,
  parseNumber,
  swapConditions,
} from './dataset';
import { parseCsv } from './parse-table';

const datasetOf = (csv: string) => {
  const parsed = parseCsv(csv);
  if (!parsed.ok) throw new Error(parsed.error);

  return buildDataset(parsed.table, guessMapping(parsed.table.columns));
};

describe('parseNumber', () => {
  it('reads plain numbers, thousands separators, and dollars', () => {
    expect(parseNumber('45')).toBe(45);
    expect(parseNumber(' 45.5 ')).toBe(45.5);
    expect(parseNumber('1,250')).toBe(1250);
    expect(parseNumber('$1.20')).toBe(1.2);
    expect(parseNumber('-3')).toBe(-3);
  });

  it('rejects anything else', () => {
    expect(parseNumber('45 min')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('1e999')).toBeNull();
  });
});

describe('parseBoolean', () => {
  it('reads true and false in their common spellings', () => {
    expect(parseBoolean('TRUE')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('no')).toBe(false);
    expect(parseBoolean('maybe')).toBeNull();
  });
});

describe('buildDataset', () => {
  it('skips rows with reasons: no condition, a non-numeric duration, and zero or negative durations', () => {
    const dataset = datasetOf('condition,minutes\nA,40\n,30\nA,abc\nB,0\nB,-5\nB,52\nA,\n');

    expect(dataset.rows.map((row) => row.minutes)).toEqual([40, 52]);
    expect(dataset.total).toBe(7);
    expect(dataset.issues).toEqual([
      { row: 2, message: 'it has no condition', skipped: true },
      { row: 3, message: 'its duration, “abc”, isn’t a number', skipped: true },
      { row: 4, message: 'its duration, 0, isn’t more than zero minutes', skipped: true },
      { row: 5, message: 'its duration, -5, isn’t more than zero minutes', skipped: true },
      { row: 7, message: 'it has no duration', skipped: true },
    ]);
  });

  it('skips a third condition, since this tool compares two', () => {
    const dataset = datasetOf('condition,minutes\nA,1\nB,2\nC,3\n');

    expect(dataset.labels).toEqual(['A', 'B']);
    expect(dataset.issues[0]).toEqual({
      row: 3,
      message: 'its condition, “C”, is a third one. This tool compares two.',
      skipped: true,
    });
  });

  it('keeps a row with an unreadable optional value, leaving that value blank', () => {
    const dataset = datasetOf('condition,minutes,rework,cost\nA,4,maybe,$-1\n');

    expect(dataset.rows[0]).toMatchObject({ minutes: 4, rework: null, cost: null });
    expect(dataset.issues).toEqual([
      { row: 1, message: 'rework “maybe” isn’t true or false, so it’s left blank', skipped: false },
      {
        row: 1,
        message: 'cost “$-1” isn’t a number of zero or more, so it’s left blank',
        skipped: false,
      },
    ]);
  });

  it('lists at most a couple of hundred issues but counts them all', () => {
    const rows = Array.from({ length: 500 }, () => 'A,oops').join('\n');
    const dataset = datasetOf(`condition,minutes\n${rows}\n`);

    expect(dataset.issues).toHaveLength(MAX_LISTED_ISSUES);
    expect(dataset.issueCount).toBe(500);
  });

  it('reads more than 10,000 rows', () => {
    const rows = Array.from(
      { length: 12_000 },
      (_, index) => `${index % 2 ? 'B' : 'A'},${10 + (index % 7)}`,
    );
    const dataset = datasetOf(`condition,minutes\n${rows.join('\n')}\n`);

    expect(dataset.rows).toHaveLength(12_000);
    expect(dataset.issueCount).toBe(0);
  });
});

describe('swapConditions', () => {
  it('makes the second condition A, and leaves a single condition alone', () => {
    expect(swapConditions(datasetOf('condition,minutes\nafter,1\nbefore,2\n')).labels).toEqual([
      'before',
      'after',
    ]);
    expect(swapConditions(datasetOf('condition,minutes\nA,1\n')).labels).toEqual(['A']);
  });
});
