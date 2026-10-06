import { describe, expect, it } from 'vitest';

import { guessMapping } from './columns';
import { buildDataset } from './dataset';
import {
  buildOutcomes,
  formatDifference,
  formatOutcomeInterval,
  formatValue,
  outcomesToCsv,
} from './outcomes';
import type { CostIntervalState, OutcomeRow } from './outcomes';
import { parseCsv } from './parse-table';
import { findPreset } from './presets';

const outcomesOf = (csv: string, cost: CostIntervalState = null): OutcomeRow[] => {
  const parsed = parseCsv(csv);
  if (!parsed.ok) throw new Error(parsed.error);
  const mapping = guessMapping(parsed.table.columns);

  return buildOutcomes(buildDataset(parsed.table, mapping), mapping, true, cost);
};

const byId = (rows: OutcomeRow[], id: OutcomeRow['id']): OutcomeRow =>
  rows.find((row) => row.id === id)!;

describe('buildOutcomes', () => {
  it('greys out every row the data has no column for', () => {
    const rows = outcomesOf(findPreset('five-unpaired')!.csv);

    expect(rows.map((row) => [row.id, row.available])).toEqual([
      ['time', true],
      ['rework', false],
      ['review', false],
      ['cost', false],
      ['accepted', false],
    ]);
    expect(byId(rows, 'rework').note).toBe('Not in your data.');
  });

  it('shows the paired preset’s time row with its interval', () => {
    const time = byId(outcomesOf(findPreset('five-paired')!.csv), 'time');

    expect(formatValue(time, time.a)).toBe('48.0 min');
    expect(formatValue(time, time.b)).toBe('41.0 min');
    expect(formatDifference(time)).toBe('7.0 min');
    expect(formatOutcomeInterval(time)).toBe('[3.83, 10.17] min');
    expect(time.note).toBe('Paired t, 5 tasks.');
  });

  it('fills every row for the rework preset, with Wilson intervals and the cost per accepted result', () => {
    const rows = outcomesOf(findPreset('faster-more-rework')!.csv, {
      seed: 1,
      resamples: 10_000,
      usable: 10_000,
      lower: -0.9,
      upper: -0.3,
    });
    const rework = byId(rows, 'rework');
    const cost = byId(rows, 'cost');

    expect(formatValue(rework, rework.a)).toBe('18.8%');
    expect(formatValue(rework, rework.b)).toBe('37.5%');
    expect(formatDifference(rework)).toBe('−18.8 pts');
    expect(rework.aDetail).toMatch(/^3 of 16; 95% /);

    expect(formatValue(cost, cost.a)).toBe('$1.28');
    expect(formatValue(cost, cost.b)).toBe('$1.87');
    expect(formatDifference(cost)).toBe('−$0.59');
    expect(formatOutcomeInterval(cost)).toBe('[−$0.90, −$0.30]');
    expect(cost.aDetail).toBe('$19.20 over 15 accepted');
    expect(cost.note).toBe('Bootstrap, 10,000 resamples, seed 1.');
  });

  it('says when the cost interval is still running', () => {
    const cost = byId(outcomesOf(findPreset('faster-more-rework')!.csv, 'running'), 'cost');

    expect(cost.note).toBe('Bootstrapping the interval…');
    expect(formatOutcomeInterval(cost)).toBe('—');
  });

  it('rounds an exact half cent up', () => {
    const rows = outcomesOf(
      'condition,minutes,accepted,cost\nA,1,true,0.335\nA,2,true,0.335\nB,1,true,1\nB,2,true,1\n',
    );

    expect(formatValue(byId(rows, 'cost'), byId(rows, 'cost').a)).toBe('$0.34');
  });
});

describe('outcomesToCsv', () => {
  it('exports plain numbers under the condition labels', () => {
    const csv = outcomesToCsv(outcomesOf(findPreset('five-unpaired')!.csv), ['A', 'B']);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe('outcome,unit,A,B,difference (A - B),interval low,interval high,note');
    expect(lines[1]).toBe(
      'Time to accepted result,minutes,48,40.8,7.2,-11.603991,26.003991,"Welch, 5 and 5 tasks."',
    );
    expect(lines[2]).toBe('Rework rate,rate,,,,,,Not in your data.');
    expect(lines).toHaveLength(6);
  });

  it('defuses condition labels a spreadsheet would run as formulas', () => {
    const rows = outcomesOf(findPreset('five-unpaired')!.csv);
    const header = (labels: string[]): string => outcomesToCsv(rows, labels).split('\n')[0];

    expect(header(['=1+1', '@SUM(A1)'])).toBe(
      "outcome,unit,'=1+1,'@SUM(A1),difference (=1+1 - @SUM(A1)),interval low,interval high,note",
    );
    expect(header(['+cmd', '-2'])).toContain(",'+cmd,'-2,");
    expect(header(['\tTab', '\rReturn'])).toContain(',\'\tTab,"\'\rReturn",');
  });
});
