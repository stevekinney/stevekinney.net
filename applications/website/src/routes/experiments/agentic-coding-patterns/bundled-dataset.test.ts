import { describe, expect, it } from 'vitest';

import { buildGrid } from './explorer-state';
import { backlinksOf, buildGraph } from './graph-metrics';
import patterns from './patterns.json';
import { buildSearchDocuments, parseQuery, search } from './search';
import { parseDataset } from './validate-dataset';

// These are the checks the specification makes against the real library, run
// against the dataset that ships. If the vault changes, rebuild with
// `bun run experiments:patterns:build` and update the numbers on purpose.
const { entries, report } = parseDataset(patterns);
const graph = buildGraph(entries);
const named = (name: string) => entries.find((entry) => entry.name === name);

describe('the bundled library', () => {
  it('has 118 entries: 93 patterns and 25 methodologies', () => {
    expect(entries).toHaveLength(118);
    expect(report.includedByType).toEqual({ pattern: 93, methodology: 25 });
    expect(report.notesRead).toBe(121);
    expect(report.excluded.map(({ path }) => path)).toEqual([
      'Agentic Coding Patterns.md',
      'Agentic Coding Primitives.md',
      'Research Notes.md',
    ]);
  });

  it('has the category, maturity, and confidence counts the heat grid shows', () => {
    const maturity = buildGrid(entries, 'maturity');

    expect(Object.fromEntries(maturity.rows.map((row) => [row.category, row.total]))).toEqual({
      methodology: 27,
      'context-management': 20,
      verification: 17,
      'control-loop': 15,
      'multi-agent': 12,
      academic: 11,
      planning: 9,
      governance: 7,
    });
    expect(maturity.rows.map((row) => row.category)).toEqual([
      'methodology',
      'context-management',
      'verification',
      'control-loop',
      'multi-agent',
      'academic',
      'planning',
      'governance',
    ]);
    expect(maturity.columnTotals).toEqual([3, 77, 38]);
    expect(buildGrid(entries, 'confidence').columnTotals).toEqual([11, 79, 28]);
    expect(report.unknown).toEqual([]);
  });

  it('is not marked partial where a note nests its sections under a title heading', () => {
    for (const name of ['Agent Handoff', 'Vibe Coding']) {
      const entry = named(name);

      expect(entry?.missing).toEqual([]);
      expect(entry?.summary).not.toBe('');
      expect(entry?.whenToUse).not.toBe('');
      expect(entry?.whenNotToUse).not.toBe('');
    }
    // Every note in the vault has all three sections, so none is partial today.
    expect(report.partial).toEqual([]);
  });

  it('describes Agent Teams: Emerging, aliased Peer Mesh, and nine related patterns with notes', () => {
    const entry = named('Agent Teams');

    expect(entry?.confidence).toBe('Emerging');
    expect(entry?.aliases).toContain('Peer Mesh');
    expect(entry?.related).toContain('Delegation Chain');
    expect(entry?.related).toContain('Subagent Context Isolation');
    expect(entry?.related.filter((name) => graph.resolve(name))).toHaveLength(9);
    // The tenth is a deep-dive note that lives outside the library.
    expect(report.dangling).toContainEqual({
      id: 'agent-teams',
      name: 'Agent Teams',
      target: 'Subagents, Parallel Workflows, and Agent Orchestration',
    });
  });

  it('lists as "Referenced by" every entry whose related list includes Agent Teams', () => {
    const expected = entries
      .filter((entry) => entry.related.some((name) => name.toLowerCase() === 'agent teams'))
      .map((entry) => entry.name)
      .sort();

    expect(expected.length).toBeGreaterThan(0);
    expect(backlinksOf(graph, 'agent-teams').map(({ entry }) => entry.name)).toEqual(expected);
  });

  it('finds Circuit Breaker for "cap inflation", which only its drawbacks mention', () => {
    const hits = search(buildSearchDocuments(entries), parseQuery('"cap inflation"'));

    expect(hits.map(({ id }) => id)).toEqual(['circuit-breaker']);
    expect(hits[0]?.field).toBe('drawbacks');
  });

  it('has unique ids and the related total the report states', () => {
    expect(new Set(entries.map(({ id }) => id)).size).toBe(entries.length);
    expect(entries.reduce((sum, { related }) => sum + related.length, 0)).toBe(
      report.relatedLinkCount,
    );
  });
});
