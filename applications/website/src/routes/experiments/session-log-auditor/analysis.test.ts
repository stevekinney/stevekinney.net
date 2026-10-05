import { describe, expect, it } from 'vitest';

import modelPricingData from '../model-calculator/model-pricing.toml';
import { parseModelPricingCatalog } from '../model-calculator/model-pricing-schema';
import { analyze, emptyFilters } from './analysis';
import type { Filters } from './analysis';
import type { AuditData } from './audit-data';
import { clusterErrors } from './clusters';
import { comparePeriods, halves } from './compare';
import { costHistogram, costliestSessions } from './cost';
import { readFixtures, readLinesByFile } from './fixture-reader';
import { findPreset, presets } from './presets';
import { toPriceRows } from './pricing';
import { defaultRules } from './rules';
import { failuresByDay } from './timeline';

const prices = toPriceRows(parseModelPricingCatalog(modelPricingData).models);

const run = (data: AuditData, filters: Partial<Filters> = {}) =>
  analyze({
    data,
    rules: defaultRules,
    prices,
    filters: { ...emptyFilters, ...filters },
    marks: [],
  });

const readPreset = (id: string): AuditData => {
  const preset = findPreset(id);
  if (!preset) throw new Error(`No preset ${id}`);

  return readLinesByFile(
    Object.fromEntries(preset.files().map((file) => [file.path, file.text.split('\n')])),
  );
};

describe('analyze with the fixtures', () => {
  const analysis = run(readFixtures());

  it('fills the overview tiles from code', () => {
    expect(analysis.overview).toMatchObject({
      sessions: 2,
      turns: 4,
      subagentTurns: 1,
      toolCalls: 4,
      failures: 5,
      failureShare: 1.25,
      floorFailures: 3,
      askFailures: 0,
      unpricedTurns: 1,
      compactions: { manual: 1, auto: 0, other: 0, medianRatio: 12_969 / 312_693 },
    });
    expect(analysis.overview.floorShare).toBe(0.6);
  });

  it('bills the duplicated response once', () => {
    // $0.114 for the deduplicated Opus turn, plus the subagent's Haiku turn and the second session's Opus turn.
    const haiku = (10 * 1 + 5_000 * 0.1 + 2_000 * 2 + 300 * 5) / 1_000_000;
    const opus = (50 * 4 + 20_000 * 0.2 + 1_000 * 5 + 800 * 20) / 1_000_000;

    expect(analysis.overview.cost).toBeCloseTo(0.114 + haiku + opus, 12);
    expect(analysis.cost.unpricedModels).toEqual(['claude-opus-5']);
    expect(analysis.cost.assumedFiveMinuteTurns).toBe(1);
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

  it('lists the versions and the filter choices', () => {
    expect(analysis.versions).toEqual([{ version: '3.1.2', sessions: 2 }]);
    expect(analysis.options).toMatchObject({
      branches: ['feature/search', 'main'],
      firstDay: '2026-09-02',
      lastDay: '2026-09-12',
    });
  });
});

describe('filters', () => {
  const data = readFixtures();

  it('narrows every panel to a branch', () => {
    const analysis = run(data, { branch: 'feature/search' });

    expect(analysis.overview).toMatchObject({ sessions: 1, turns: 2, failures: 1 });
    expect(analysis.compactions).toEqual([]);
  });

  it('narrows to a date range', () => {
    expect(run(data, { from: '2026-09-10' }).overview.sessions).toBe(1);
    expect(run(data, { to: '2026-09-02' }).overview.failures).toBe(4);
  });

  it('narrows to a model, a tool, a category, and a search', () => {
    expect(run(data, { model: 'claude-haiku-4-5' }).overview.turns).toBe(1);
    expect(run(data, { tool: 'unknown' }).overview.failures).toBe(1);
    expect(run(data, { category: 'floor: shell option' }).clusters).toHaveLength(1);
    expect(run(data, { search: 'PATHSPEC' }).clusters.map((cluster) => cluster.tool)).toEqual([
      'Bash',
    ]);
  });
});

describe('the presets', () => {
  it('reads every preset without skipping anything it didn’t mean to', () => {
    for (const preset of presets) {
      const data = readPreset(preset.id);

      expect(data.sessions.length).toBeGreaterThan(0);
      expect(data.errors.every((error) => error.quote !== null)).toBe(true);
    }
  });

  it('ranks the four-session cluster above the 200-retry one', () => {
    const analysis = run(readPreset('retry-storm'));

    expect(
      analysis.clusters.map(({ signature, sessions, occurrences }) => [
        signature,
        sessions,
        occurrences,
      ]),
    ).toEqual([
      ['zsh: command not found: pnpm', 4, 4],
      ['Error: connect ECONNREFUSED <n>:<n>', 3, 202],
    ]);
  });

  it('stops the timeout failures on September 1 in the fixed floor preset', () => {
    const analysis = run(readPreset('floor-fixed'));
    const timeout = analysis.clusters.find((cluster) => cluster.signature.endsWith('timeout'));

    expect(timeout?.lastSeen?.slice(0, 10)).toBe('2026-08-29');
    expect(analysis.overview.floorShare).toBeGreaterThan(0.5);
    expect(analysis.overview.compactions.manual).toBe(1);
    expect(analysis.cost.unpricedModels).toEqual(['claude-opus-5']);
  });

  it('flags the timeout cluster as back after zero in the regression preset', () => {
    const analysis = run(readPreset('regression'));
    const timeout = analysis.clusters.find((cluster) => cluster.signature.endsWith('timeout'));

    expect(timeout && analysis.returns[timeout.key]).toBe('2026-09-10');
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

describe('comparePeriods', () => {
  it('sorts clusters into appeared, disappeared, and changed', () => {
    const clusters = run(readPreset('floor-fixed')).clusters;
    const { a, b } = halves('2026-08-17', '2026-09-27');
    const comparison = comparePeriods(clusters, a, b, 0.5);

    expect(a).toEqual({ from: '2026-08-17', to: '2026-09-06' });
    expect(b).toEqual({ from: '2026-09-07', to: '2026-09-27' });
    expect(comparison.disappeared.map((change) => change.signature)).toContain(
      'zsh: command not found: timeout',
    );
    expect(comparison.appeared.map((change) => change.signature)).toEqual([
      'zsh: permission denied: ./scripts/deploy.sh',
    ]);
  });
});

describe('cost panels', () => {
  it('bins session costs from zero and lists the costliest first', () => {
    expect(costHistogram([0.05, 0.12, 0.31, 0.95], 4)).toEqual([
      { from: 0, to: 0.5, count: 3 },
      { from: 0.5, to: 1, count: 1 },
    ]);

    const sessions = run(readFixtures()).cost.sessions;
    expect(costliestSessions(sessions, 1)[0].sessionId).toBe(
      'aaaaaaaa-0000-4000-8000-000000000001',
    );
  });
});
