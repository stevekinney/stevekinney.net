import { describe, expect, it } from 'vitest';

import {
  backlinksOf,
  buildGraph,
  isMutual,
  mostConnected,
  neighborsOf,
  sharedRelations,
} from './graph-metrics';
import { boundsOf, layoutGraph, radialLayout } from './graph-layout';
import type { PatternEntry } from './pattern-types';

const entry = (name: string, related: string[]): PatternEntry => ({
  id: name.toLowerCase(),
  name,
  type: 'pattern',
  category: 'planning',
  maturity: 'established',
  confidence: 'Strong',
  aliases: [],
  summary: '',
  whenToUse: '',
  whenNotToUse: '',
  drawbacks: '',
  related,
  sourcePath: `${name}.md`,
  missing: [],
});

// A links to B and C; B links back to A and to D; D links to A; "Ghost" has no note.
const entries = [
  entry('A', ['B', 'C', 'Ghost']),
  entry('B', ['A', 'D']),
  entry('C', []),
  entry('D', ['a', 'D']),
];
const graph = buildGraph(entries);

describe('buildGraph', () => {
  it('resolves related names to ids, ignoring case, dangling links, and self-references', () => {
    expect(graph.outgoing.get('a')).toEqual(['b', 'c']);
    expect(graph.outgoing.get('d')).toEqual(['a']);
    expect(graph.incoming.get('a')).toEqual(['b', 'd']);
    expect(graph.incoming.get('c')).toEqual(['a']);
  });

  it('counts incoming plus outgoing links as degree', () => {
    expect(Object.fromEntries(graph.degree)).toEqual({ a: 4, b: 3, c: 1, d: 2 });
  });

  it('makes one edge for a mutual pair and marks it', () => {
    expect(graph.edges).toEqual([
      { source: 'a', target: 'b', mutual: true },
      { source: 'a', target: 'c', mutual: false },
      { source: 'b', target: 'd', mutual: false },
      { source: 'd', target: 'a', mutual: false },
    ]);
    expect(isMutual(graph, 'a', 'b')).toBe(true);
    expect(isMutual(graph, 'a', 'c')).toBe(false);
  });
});

describe('mostConnected', () => {
  it('ranks by degree and breaks ties by name, up to the limit', () => {
    expect(mostConnected(graph, 3).map(({ entry: { name }, degree }) => [name, degree])).toEqual([
      ['A', 4],
      ['B', 3],
      ['D', 2],
    ]);
    expect(mostConnected(graph, 15)).toHaveLength(4);
    expect(mostConnected(graph)[0]).toMatchObject({ incoming: 2, outgoing: 2 });
  });
});

describe('backlinksOf', () => {
  it('lists the entries that point here, mutual ones marked', () => {
    expect(backlinksOf(graph, 'a').map(({ entry: { name }, mutual }) => [name, mutual])).toEqual([
      ['B', true],
      ['D', false],
    ]);
    expect(backlinksOf(graph, 'c').map(({ entry: { name } }) => name)).toEqual(['A']);
    expect(backlinksOf(graph, 'unknown')).toEqual([]);
  });
});

describe('neighborsOf and sharedRelations', () => {
  it('joins both directions without repeats', () => {
    expect(neighborsOf(graph, 'a').sort()).toEqual(['b', 'c', 'd']);
  });

  it('finds relations shared by at least two entries', () => {
    expect([
      ...sharedRelations([
        entries[0] as PatternEntry,
        entries[1] as PatternEntry,
        entries[3] as PatternEntry,
      ]),
    ]).toEqual(['a', 'd']);
    expect(sharedRelations([entries[0] as PatternEntry]).size).toBe(0);
  });
});

describe('layoutGraph', () => {
  const ids = entries.map(({ id }) => id);

  it('gives every node a position, the same ones every time', () => {
    const first = layoutGraph(ids, graph.edges);
    const second = layoutGraph(ids, graph.edges);

    expect([...first.keys()]).toEqual(ids);
    expect(first).toEqual(second);
    for (const { x, y } of first.values()) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
  });

  it('pulls linked nodes closer than unlinked ones', () => {
    const positions = layoutGraph(['a', 'b', 'c', 'd'], [{ source: 'a', target: 'b' }]);
    const distance = (first: string, second: string): number =>
      Math.hypot(
        (positions.get(first)?.x ?? 0) - (positions.get(second)?.x ?? 0),
        (positions.get(first)?.y ?? 0) - (positions.get(second)?.y ?? 0),
      );

    expect(distance('a', 'b')).toBeLessThan(distance('a', 'c'));
  });

  it('handles no nodes, and bounds a set of points', () => {
    expect(layoutGraph([], []).size).toBe(0);
    expect(
      boundsOf(
        [
          { x: 0, y: 10 },
          { x: 20, y: 30 },
        ],
        5,
      ),
    ).toEqual({ x: -5, y: 5, width: 30, height: 30 });
    expect(boundsOf([])).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});

describe('radialLayout', () => {
  it('puts the center in the middle and the neighbors around it', () => {
    const positions = radialLayout('a', ['b', 'c'], { width: 400, height: 200 });

    expect(positions.get('a')).toEqual({ x: 200, y: 100 });
    expect(positions.get('b')?.y).toBeLessThan(100);
    expect(positions.size).toBe(3);
  });
});
