import { describe, expect, it } from 'vitest';

import type { AuditError } from './audit-data';
import { clusterErrors } from './clusters';
import type { Cluster } from './clusters';
import {
  controlRow,
  HOLDING,
  isCalendarDate,
  parseMarks,
  REGRESSION,
  returnAfterZero,
  serializeMarks,
  upsertMark,
} from './control-rows';
import type { FixMark } from './control-rows';
import { defaultRules } from './rules';

const MESSAGE = 'zsh: command not found: timeout';

const failureOn = (day: string, sessionId: string): AuditError => ({
  id: `${sessionId}:${day}`,
  sessionId,
  timestamp: `${day}T12:00:00.000Z`,
  tool: 'Bash',
  model: 'claude-opus-5-5',
  command: null,
  exitCode: 1,
  message: MESSAGE,
  signature: MESSAGE,
  quote: MESSAGE,
  file: `${sessionId}.jsonl`,
  line: 1,
});

const clusterOf = (failures: AuditError[]): Cluster => clusterErrors(failures, defaultRules)[0];

const before = [
  failureOn('2026-08-20', 'one'),
  failureOn('2026-08-25', 'two'),
  failureOn('2026-08-25', 'three'),
  failureOn('2026-09-01', 'four'),
];

const markOn = (cluster: Cluster, date: string): FixMark => ({
  key: cluster.key,
  tool: cluster.tool,
  signature: cluster.signature,
  date,
});

describe('controlRow (acceptance check 6)', () => {
  it('holds at 0 when nothing happens after the fix date', () => {
    const cluster = clusterOf(before);
    const row = controlRow(markOn(cluster, '2026-09-01'), cluster);

    expect(row).toMatchObject({
      status: HOLDING,
      regression: false,
      sessionsBefore: 4,
      sessionsAfter: 0,
      occurrencesAfter: 0,
      firstReturn: null,
    });
    expect(row.status).toBe('holding at 0');
  });

  it('raises the Regression flag for one occurrence on 2026-09-10', () => {
    const cluster = clusterOf([...before, failureOn('2026-09-10', 'five')]);
    const row = controlRow(markOn(cluster, '2026-09-01'), cluster);

    expect(row).toMatchObject({
      status: REGRESSION,
      regression: true,
      sessionsAfter: 1,
      occurrencesAfter: 1,
      firstReturn: '2026-09-10',
    });
    expect(row.status).toBe('Regression');
  });

  it('plots sessions affected per day, split at the fix date', () => {
    const cluster = clusterOf([...before, failureOn('2026-09-10', 'five')]);

    expect(controlRow(markOn(cluster, '2026-09-01'), cluster).series).toEqual([
      { day: '2026-08-20', sessions: 1, after: false },
      { day: '2026-08-25', sessions: 2, after: false },
      { day: '2026-09-01', sessions: 1, after: false },
      { day: '2026-09-10', sessions: 1, after: true },
    ]);
  });

  it('holds at 0 for a mark whose cluster isn’t in the loaded sessions', () => {
    const row = controlRow(
      { key: '["Bash","gone"]', tool: 'Bash', signature: 'gone', date: '2026-09-01' },
      undefined,
    );

    expect(row).toMatchObject({ seen: false, status: HOLDING, sessionsBefore: 0 });
  });
});

describe('returnAfterZero', () => {
  const activeDays = Array.from({ length: 20 }, (_, index) =>
    new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
  );

  it('flags a cluster that comes back after seven quiet active days', () => {
    const cluster = clusterOf([failureOn('2026-09-01', 'a'), failureOn('2026-09-12', 'b')]);

    expect(returnAfterZero(cluster, activeDays)).toBe('2026-09-12');
  });

  it('doesn’t flag a short gap, or days when nothing ran at all', () => {
    const shortGap = clusterOf([failureOn('2026-09-01', 'a'), failureOn('2026-09-05', 'b')]);
    expect(returnAfterZero(shortGap, activeDays)).toBeNull();

    // Only three active days sit between the two failures.
    const sparse = ['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-15', '2026-09-20'];
    const quietWeeks = clusterOf([failureOn('2026-09-01', 'a'), failureOn('2026-09-20', 'b')]);
    expect(returnAfterZero(quietWeeks, sparse)).toBeNull();
  });
});

describe('fix mark storage', () => {
  it('reads back what it writes', () => {
    const marks: FixMark[] = [
      { key: '["Bash","x"]', tool: 'Bash', signature: 'x', date: '2026-09-01' },
    ];

    expect(parseMarks(serializeMarks(marks))).toEqual({ marks });
  });

  it('rejects a mark without a real date', () => {
    expect(parseMarks('[{"tool":"Bash","signature":"x","date":"2026-02-30"}]')).toEqual({
      error: 'Mark 1 needs a tool, a signature, and a YYYY-MM-DD date.',
    });
    expect(parseMarks('{')).toEqual({ error: 'That file isn’t valid JSON.' });
  });

  it('replaces the mark for the same cluster', () => {
    const first: FixMark = { key: 'k', tool: 'Bash', signature: 'x', date: '2026-09-01' };

    expect(upsertMark([first], { ...first, date: '2026-09-05' })).toEqual([
      { ...first, date: '2026-09-05' },
    ]);
  });

  it('knows a calendar date', () => {
    expect(isCalendarDate('2026-09-01')).toBe(true);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('Sept 1')).toBe(false);
  });
});
