import { describe, expect, it } from 'vitest';

import { analyze, verdictOf } from './analysis';
import { clusterErrors } from './clusters';
import { readFixtures } from './fixture-reader';
import { defaultRules, UNCLASSIFIED } from './rules';
import { readSample } from './sample';
import { failuresByDay } from './timeline';

describe('analyze with the fixtures', () => {
  const analysis = analyze(readFixtures());

  it('counts the sessions, the failures, and the floor’s share in code', () => {
    expect(analysis).toMatchObject({
      sessions: 2,
      failures: 5,
      floorFailures: 3,
      floorShare: 0.6,
      floorSessions: 2,
    });
  });

  it('ranks the timeout cluster first, across both sessions', () => {
    expect(analysis.clusters[0]).toMatchObject({
      signature: 'zsh: command not found: timeout',
      category: 'floor: missing tool',
      sessions: 2,
      occurrences: 2,
      exitCodes: [1],
    });
  });
});

describe('verdictOf', () => {
  it.each([
    ['floor: missing tool', 'floor'],
    ['floor: permissions', 'floor'],
    ['floor or task (ask)', 'floor or task'],
    ['harness', 'harness'],
    [UNCLASSIFIED, 'task'],
  ])('calls %s %s', (category, verdict) => {
    expect(verdictOf(category)).toBe(verdict);
  });
});

describe('the sample', () => {
  const data = readSample();
  const analysis = analyze(data);

  it('reads cleanly, with every failure quotable', () => {
    expect(data.sessions).toHaveLength(24);
    expect(data.skippedLines).toBe(0);
    expect(data.errors.every((error) => error.quote !== null)).toBe(true);
  });

  it('stops the timeout failures before September 1, and the floor is most of the failures', () => {
    const timeout = analysis.clusters.find((cluster) => cluster.signature.endsWith('timeout'));

    expect(timeout?.lastSeen?.slice(0, 10)).toBe('2026-08-29');
    expect(analysis.floorShare).toBeGreaterThan(0.5);
  });
});

describe('failuresByDay', () => {
  it('stacks failures by category and fills the days between with zero', () => {
    const timeline = failuresByDay(clusterErrors(readFixtures().errors, defaultRules));

    expect(timeline).toHaveLength(11);
    expect(timeline[0]).toMatchObject({
      day: '2026-09-02',
      total: 4,
      counts: { 'floor: missing tool': 1, 'floor: shell option': 1, unclassified: 2 },
    });
    expect(timeline[5]).toEqual({ day: '2026-09-07', counts: {}, total: 0 });
  });
});
