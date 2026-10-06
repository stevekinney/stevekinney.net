import { describe, expect, it } from 'vitest';

import { projectionToCsv, summaryToMarkdown } from './export-report';
import { defaultModels } from './pricing';
import { project } from './projection';
import { defaultScenario, toProjectionInputs } from './scenario';

const inputs = toProjectionInputs(defaultScenario, defaultModels);
const projection = project(inputs);
const opus = defaultModels[1];

describe('projectionToCsv', () => {
  const lines = projectionToCsv(projection).trimEnd().split('\n');

  it('has a header and one row for every turn from 0 to T', () => {
    expect(lines[0]).toBe('Turn,Keep going,Compact now,Clear now');
    expect(lines).toHaveLength(31 + 1);
    expect(lines[1].split(',')[0]).toBe('0');
    expect(lines.at(-1)?.split(',')[0]).toBe('30');
  });

  it('holds every strategy’s dollars at each turn', () => {
    expect(lines[1]).toBe('0,0.000000,1.050000,0.400000');
    expect(lines.at(-1)).toBe(
      `30,${projection.keep[30].toFixed(6)},${projection.compact[30].toFixed(6)},${projection.clear[30].toFixed(6)}`,
    );
  });

  it('adds a column for compact later when it is on', () => {
    const withLater = projectionToCsv(project(inputs, 5)).trimEnd().split('\n');

    expect(withLater[0]).toBe('Turn,Keep going,Compact now,Clear now,Compact later');
    expect(withLater[1].split(',')).toHaveLength(5);
  });
});

describe('summaryToMarkdown', () => {
  const markdown = summaryToMarkdown(defaultScenario, opus, projection);

  it('states the scenario', () => {
    expect(markdown).toContain('- Model: Opus 5 ($5/$25)');
    expect(markdown).toContain('- Cache: 1-hour TTL, warm when you compact');
    expect(markdown).toContain('- Context now: 400K tokens');
    expect(markdown).toContain('- Summary size: 20K tokens (5%)');
  });

  it('gives the three up-front costs', () => {
    expect(markdown).toContain('- Keep going: $0.00');
    expect(markdown).toContain(
      '- Compact now: $1.05 (read history $0.20, generate the summary $0.50, rebuild the cache $0.35)',
    );
    expect(markdown).toContain('- Clear now: $0.40');
  });

  it('gives the crossovers and the cost after T turns', () => {
    expect(markdown).toContain('- Compacting: after 6 turns');
    expect(markdown).toContain('- Clearing: after 3 turns');
    expect(markdown).toContain('## Total after 30 turns');
    expect(markdown).toContain('- Keep going: $11.12');
    expect(markdown).toContain('- Compact now: $6.70');
    expect(markdown).toContain('- Clear now: $6.12');
  });

  it('says so when compacting does not pay within T turns', () => {
    const never = project({ ...inputs, contextNow: 20_000, summaryPercent: 30 });

    expect(summaryToMarkdown(defaultScenario, opus, never)).toContain(
      '- Compacting: not within 30 turns',
    );
  });

  it('adds compact later when it is on', () => {
    const scenario = { ...defaultScenario, laterEnabled: true, laterAfter: 5 };
    const text = summaryToMarkdown(scenario, opus, project(inputs, 5));

    expect(text).toContain('- Compact later: ');
    expect(text).toContain('- Compacting later: ');
  });

  it('uses no horizontal rules and no spaced em dashes', () => {
    expect(markdown).not.toMatch(/^---$/m);
    expect(markdown).not.toContain(' — ');
  });
});
